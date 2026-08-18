import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';

interface JoinProductRoomAck {
  productId: string;
  joined: true;
}

interface ReviewCountUpdatedPayload {
  productId: string;
  reviewCount: number;
}

/**
 * e2e — real-time review count (issue #10, F2).
 * Test plan: docs/architecture/backend/01-folder-structure.md §6 (F2 API).
 */
describe('Review count WebSocket (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let serverUrl: string;
  let socket: Socket | undefined;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    await app.listen(0, '127.0.0.1');
    serverUrl = await app.getUrl();
  });

  beforeEach(async () => {
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    socket?.disconnect();
    socket = undefined;
  });

  afterAll(async () => {
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    await app.close();
    await prisma.$disconnect();
  });

  it('emits review_count_updated after a review is created', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'WebSocket Product',
        description: 'Product used by the WebSocket E2E test.',
        category: 'unisex',
        price: 100000,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: 'WebSocket Reviewer',
        email: 'websocket-reviewer@example.com',
      },
    });

    socket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      socket!.once('connect', resolve);
      socket!.once('connect_error', reject);
    });

    const joinAck = await new Promise<JoinProductRoomAck>((resolve) => {
      socket!.emit('joinProductRoom', { productId: product.id }, resolve);
    });

    expect(joinAck).toEqual({
      productId: product.id,
      joined: true,
    });

    const reviewCountEvent = new Promise<ReviewCountUpdatedPayload>((resolve) => {
      socket!.once('review_count_updated', resolve);
    });

    await request(app.getHttpServer())
      .post('/api/reviews')
      .send({
        productId: product.id,
        userId: user.id,
        rating: 5,
        title: 'Ukuran produknya pas',
        body: 'Ukuran produk ini terasa pas dan nyaman digunakan.',
      })
      .expect(201);

    await expect(reviewCountEvent).resolves.toEqual({
      productId: product.id,
      reviewCount: 1,
    });
  });

  it('does not emit to clients that did not join the product room', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Unsubscribed Product',
        description: 'Product used to verify room isolation.',
        category: 'unisex',
        price: 90000,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Unsubscribed Reviewer',
        email: 'unsubscribed-reviewer@example.com',
      },
    });

    socket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      socket!.once('connect', resolve);
      socket!.once('connect_error', reject);
    });

    let receivedEvent = false;
    socket!.once('review_count_updated', () => {
      receivedEvent = true;
    });

    await request(app.getHttpServer())
      .post('/api/reviews')
      .send({
        productId: product.id,
        userId: user.id,
        rating: 4,
        title: 'Tanpa subscribe',
        body: 'Klien yang tidak join room tidak boleh menerima event ini.',
      })
      .expect(201);

    // Give the server a moment to (not) deliver the event.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(receivedEvent).toBe(false);
  });
});
