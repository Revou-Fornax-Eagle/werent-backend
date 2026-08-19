import { INestApplication } from '@nestjs/common';
import { FitFeedback, PrismaClient } from '@prisma/client';
import { ReviewsService } from '../src/reviews/reviews.service';
import { createTestApp } from './helpers/test-app';

describe('Fit assessment aggregation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let reviewsService: ReviewsService;

  beforeAll(async () => {
    const testContext = await createTestApp();
    app = testContext.app;
    prisma = testContext.prisma;
    reviewsService = app.get(ReviewsService);
  });

  beforeEach(async () => {
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('aggregates active fit responses for only the requested product', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Fit Product',
        description: 'Product for fit assessment integration test.',
        category: 'unisex',
        price: 100000,
      },
    });
    const otherProduct = await prisma.product.create({
      data: {
        name: 'Other Product',
        description: 'Product whose feedback must not leak into the result.',
        category: 'unisex',
        price: 90000,
      },
    });
    const users = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        prisma.user.create({
          data: {
            email: `fit-user-${index}@example.com`,
            name: `Fit User ${index}`,
          },
        }),
      ),
    );

    await prisma.review.createMany({
      data: [
        {
          productId: product.id,
          userId: users[0].id,
          rating: 5,
          title: 'True to size one',
          body: 'The product fits exactly as expected for this size.',
          fitFeedback: FitFeedback.TRUE_TO_SIZE,
        },
        {
          productId: product.id,
          userId: users[1].id,
          rating: 4,
          title: 'True to size two',
          body: 'The selected size fits comfortably and as expected.',
          fitFeedback: FitFeedback.TRUE_TO_SIZE,
        },
        {
          productId: product.id,
          userId: users[2].id,
          rating: 4,
          title: 'Runs small',
          body: 'The selected size feels smaller than I expected.',
          fitFeedback: FitFeedback.RUNS_SMALL,
        },
        {
          productId: product.id,
          userId: users[3].id,
          rating: 3,
          title: 'No fit response',
          body: 'This review intentionally has no fit feedback value.',
        },
        {
          productId: product.id,
          userId: users[4].id,
          rating: 2,
          title: 'Deleted response',
          body: 'This soft-deleted fit response must not be counted.',
          fitFeedback: FitFeedback.RUNS_LARGE,
          isDeleted: true,
        },
        {
          productId: otherProduct.id,
          userId: users[0].id,
          rating: 5,
          title: 'Other product response',
          body: 'This feedback belongs to another product and is excluded.',
          fitFeedback: FitFeedback.RUNS_LARGE,
        },
      ],
    });

    await expect(reviewsService.getFitAssessment(product.id)).resolves.toEqual({
      assessment: FitFeedback.TRUE_TO_SIZE,
      distribution: {
        RUNS_SMALL: 1,
        TRUE_TO_SIZE: 2,
        RUNS_LARGE: 0,
      },
      totalResponses: 3,
      hasData: true,
    });
  });

  it('returns no data when reviews exist without fit feedback', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'No Fit Product',
        description: 'Product with a review but no fit response.',
        category: 'unisex',
        price: 80000,
      },
    });
    const user = await prisma.user.create({
      data: { email: 'no-fit@example.com', name: 'No Fit User' },
    });
    await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: 4,
        title: 'Review without fit',
        body: 'The review is valid but contains no fit assessment response.',
      },
    });

    await expect(reviewsService.getFitAssessment(product.id)).resolves.toEqual({
      assessment: null,
      distribution: {
        RUNS_SMALL: 0,
        TRUE_TO_SIZE: 0,
        RUNS_LARGE: 0,
      },
      totalResponses: 0,
      hasData: false,
    });
  });
});
