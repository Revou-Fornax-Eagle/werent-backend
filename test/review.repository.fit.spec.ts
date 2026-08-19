import { FitFeedback } from '../src/common/enums/fit-feedback.enum';
import { ReviewRepository } from '../src/reviews/repository/review.repository';

describe('ReviewRepository — groupByFitFeedback', () => {
  it('groups active fit feedback for only the requested product', async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { fitFeedback: 'TRUE_TO_SIZE', _count: { _all: 3 } },
      { fitFeedback: 'RUNS_SMALL', _count: { _all: 1 } },
      { fitFeedback: null, _count: { _all: 2 } },
    ]);
    const repository = new ReviewRepository({ review: { groupBy } } as never);

    await expect(repository.groupByFitFeedback('product-1')).resolves.toEqual([
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 3 },
      { fitFeedback: FitFeedback.RUNS_SMALL, count: 1 },
      { fitFeedback: null, count: 2 },
    ]);
    expect(groupBy).toHaveBeenCalledWith({
      by: ['fitFeedback'],
      where: { productId: 'product-1', isDeleted: false },
      _count: { _all: true },
    });
  });
});
