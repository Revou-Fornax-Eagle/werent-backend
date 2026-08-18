import { ReviewRepository } from '../src/reviews/repository/review.repository';

type PrismaReviewCount = jest.Mock<Promise<number>, [unknown]>;

interface PrismaServiceMock {
  review: {
    count: PrismaReviewCount;
    create: jest.Mock;
  };
  product: {
    findUnique: jest.Mock;
  };
}

/**
 * Unit tests for F1 (#9) — review count aggregation.
 * Test plan: docs/architecture/backend/01-folder-structure.md §6 (F1).
 */
describe('ReviewRepository — countByProduct', () => {
  let repository: ReviewRepository;
  let prismaService: PrismaServiceMock;

  beforeEach(() => {
    prismaService = {
      review: {
        count: jest.fn() as PrismaReviewCount,
        create: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
    };

    repository = new ReviewRepository(prismaService as never);
  });

  it('TC1: returns the total count when the product has reviews', async () => {
    prismaService.review.count.mockResolvedValue(5);

    await expect(repository.countByProduct('product-1')).resolves.toBe(5);

    expect(prismaService.review.count).toHaveBeenCalledWith({
      where: { productId: 'product-1', isDeleted: false },
    });
  });

  it('TC2: returns explicit 0 when the product has no reviews', async () => {
    prismaService.review.count.mockResolvedValue(0);

    await expect(repository.countByProduct('product-1')).resolves.toBe(0);
  });

  it('TC3: excludes soft-deleted reviews from the count', async () => {
    prismaService.review.count.mockResolvedValue(3);

    await expect(repository.countByProduct('product-1')).resolves.toBe(3);

    // The where clause must filter isDeleted: false so soft-deleted rows never count.
    expect(prismaService.review.count).toHaveBeenCalledWith({
      where: { productId: 'product-1', isDeleted: false },
    });
  });

  it('returns the count for a different product without cross-contamination', async () => {
    prismaService.review.count.mockResolvedValue(2);

    await expect(repository.countByProduct('product-2')).resolves.toBe(2);

    expect(prismaService.review.count).toHaveBeenCalledWith({
      where: { productId: 'product-2', isDeleted: false },
    });
  });
});
