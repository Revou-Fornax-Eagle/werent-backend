import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';

/**
 * e2e — GET /api/products/:productId (issue #9).
 * Test plan: docs/architecture/backend/01-folder-structure.md §6 (F1/F5 API).
 */
describe('Products API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

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
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /api/products/:productId', () => {
    it('TC4: no reviews → reviewCount 0 (explicit, not null)', async () => {
      const product = await prisma.product.create({
        data: { name: 'Baju Baru', description: 'Desc', category: 'women', price: 75000 },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toMatchObject({
        id: product.id,
        name: 'Baju Baru',
        category: 'women',
        price: 75000,
      });
      expect(response.body.data.reviewCount).toBe(0);
      expect(response.body.meta).toEqual({});
    });

    it('TC5: with reviews → reviewCount reflects active reviews', async () => {
      const product = await prisma.product.create({
        data: { name: 'Gaun Pesta', description: 'Desc', category: 'women', price: 150000 },
      });
      const userOne = await prisma.user.create({ data: { email: 'a@example.com', name: 'A' } });
      const userTwo = await prisma.user.create({ data: { email: 'b@example.com', name: 'B' } });

      await prisma.review.create({
        data: {
          productId: product.id,
          userId: userOne.id,
          rating: 5,
          title: 'Pas',
          body: 'Ukurannya pas banget di badan saya, sangat nyaman.',
        },
      });
      await prisma.review.create({
        data: {
          productId: product.id,
          userId: userTwo.id,
          rating: 4,
          title: 'Kecilan',
          body: 'Sedikit kecilan di bagian dada untuk ukuran saya.',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.data.reviewCount).toBe(2);
    });

    it('soft-deleted reviews are excluded from the count', async () => {
      const product = await prisma.product.create({
        data: { name: 'Jaket', description: 'Desc', category: 'unisex', price: 120000 },
      });
      const userOne = await prisma.user.create({ data: { email: 'd@example.com', name: 'D' } });
      const userTwo = await prisma.user.create({ data: { email: 'e@example.com', name: 'E' } });

      await prisma.review.create({
        data: {
          productId: product.id,
          userId: userOne.id,
          rating: 5,
          title: 'Aktif',
          body: 'Review aktif yang dihitung dalam agregasi.',
        },
      });
      await prisma.review.create({
        data: {
          productId: product.id,
          userId: userTwo.id,
          rating: 1,
          title: 'Dihapus',
          body: 'Review yang di-soft-delete tidak boleh dihitung.',
          isDeleted: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.data.reviewCount).toBe(1);
    });

    it('TC6: product not found → 404 NOT_FOUND', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/00000000-0000-4000-8000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('invalid productId format → 400 VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/not-a-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
