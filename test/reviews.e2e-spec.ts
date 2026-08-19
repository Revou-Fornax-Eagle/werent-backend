import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';

/**
 * e2e — POST /api/reviews (issues #9, #10, #14).
 * Test plan: docs/architecture/backend/01-folder-structure.md §6 (F1/F2 API).
 */
describe('Reviews API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let existingProductId: string;
  let existingUserId: string;
  let secondUserId: string;

  beforeAll(async () => {
    const testContext = await createTestApp();
    app = testContext.app;
    prisma = testContext.prisma;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Fresh data per test: one product, two users, one pre-created review.
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const product = await prisma.product.create({
      data: { name: 'Test Product', description: 'Desc', category: 'men', price: 50000 },
    });
    existingProductId = product.id;

    const userOne = await prisma.user.create({
      data: { email: 'e2e-one@example.com', name: 'E2E One' },
    });
    existingUserId = userOne.id;
    const userTwo = await prisma.user.create({
      data: { email: 'e2e-two@example.com', name: 'E2E Two' },
    });
    secondUserId = userTwo.id;

    await prisma.review.create({
      data: {
        productId: existingProductId,
        userId: existingUserId,
        rating: 5,
        title: 'Existing review',
        body: 'Existing review body with enough length here.',
      },
    });
  });

  describe('POST /api/reviews', () => {
    it('TC1: happy path — 201 with review + reviewCount', async () => {
      const payload = {
        productId: existingProductId,
        userId: secondUserId,
        rating: 4,
        title: 'Bagus sekali!',
        body: 'Ukurannya pas di badan saya, sangat nyaman dipakai.',
        fitFeedback: 'TRUE_TO_SIZE',
      };

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review).toMatchObject({
        productId: existingProductId,
        userId: secondUserId,
        rating: 4,
        title: 'Bagus sekali!',
        fitFeedback: 'TRUE_TO_SIZE',
      });
      expect(response.body.data.reviewCount).toBe(2); // pre-created + new
      expect(response.body.meta).toEqual({});

      const storedReview = await prisma.review.findFirst({
        where: {
          productId: existingProductId,
          userId: secondUserId,
        },
      });

      expect(storedReview?.fitFeedback).toBe('TRUE_TO_SIZE');
    });

    it('returns explicit reviewCount 1 on first review of a product', async () => {
      const freshProduct = await prisma.product.create({
        data: { name: 'Fresh Product', description: 'Desc', category: 'men', price: 40000 },
      });

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send({
          productId: freshProduct.id,
          userId: secondUserId,
          rating: 5,
          title: 'Pertama kali',
          body: 'Ini review pertama untuk produk ini, count harus satu.',
        })
        .expect(201);

      expect(response.body.data.reviewCount).toBe(1);
      expect(response.body.data.review.fitFeedback).toBeNull();
    });

    it('invalid fitFeedback → 400 VALIDATION_ERROR and no review created', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send({
          productId: existingProductId,
          userId: secondUserId,
          rating: 4,
          title: 'Fit feedback salah',
          body: 'Review dengan fit feedback tidak valid harus ditolak.',
          fitFeedback: 'TOO_SMALL',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      const storedReview = await prisma.review.findFirst({
        where: {
          productId: existingProductId,
          userId: secondUserId,
        },
      });

      expect(storedReview).toBeNull();
    });

    it('TC3: duplicate (userId, productId) → 409 CONFLICT', async () => {
      const payload = {
        productId: existingProductId,
        userId: existingUserId, // already has a review for this product
        rating: 3,
        title: 'Coba lagi',
        body: 'Review kedua untuk produk yang sama harus ditolak.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send(payload)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('product not found → 404 NOT_FOUND', async () => {
      const payload = {
        productId: '00000000-0000-4000-8000-000000000000',
        userId: secondUserId,
        rating: 4,
        title: 'Produk hilang',
        body: 'Body panjang yang valid untuk review produk yang tidak ada.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send(payload)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('user not found → 404 NOT_FOUND', async () => {
      const payload = {
        productId: existingProductId,
        userId: '00000000-0000-4000-8000-000000000099',
        rating: 4,
        title: 'User hilang',
        body: 'Body panjang yang valid untuk review user yang tidak ada.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send(payload)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('rating out of range → 400 VALIDATION_ERROR', async () => {
      const payload = {
        productId: existingProductId,
        userId: secondUserId,
        rating: 6,
        title: 'Rating salah',
        body: 'Body panjang yang valid untuk review dengan rating di luar rentang.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('extra field (forbidNonWhitelisted) → 400 VALIDATION_ERROR', async () => {
      const payload = {
        productId: existingProductId,
        userId: secondUserId,
        rating: 4,
        title: 'Extra field',
        body: 'Body panjang yang valid untuk review dengan field tambahan.',
        maliciousField: 'injected',
      };

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
