import { FitFeedback } from '../src/common/enums/fit-feedback.enum';
import { FitService } from '../src/fit/fit.service';

describe('FitService', () => {
  let service: FitService;

  beforeEach(() => {
    service = new FitService();
  });

  it('returns the majority assessment and complete distribution', () => {
    const result = service.aggregate([
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 3 },
      { fitFeedback: FitFeedback.RUNS_SMALL, count: 1 },
      { fitFeedback: FitFeedback.RUNS_LARGE, count: 1 },
    ]);

    expect(result).toEqual({
      assessment: FitFeedback.TRUE_TO_SIZE,
      distribution: {
        RUNS_SMALL: 1,
        TRUE_TO_SIZE: 3,
        RUNS_LARGE: 1,
      },
      totalResponses: 5,
      hasData: true,
    });
  });

  it.each([
    [FitFeedback.RUNS_SMALL, FitFeedback.RUNS_SMALL],
    [FitFeedback.RUNS_LARGE, FitFeedback.RUNS_LARGE],
  ])('returns %s when it has the highest count', (fitFeedback, expected) => {
    const result = service.aggregate([
      { fitFeedback, count: 3 },
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 1 },
    ]);

    expect(result.assessment).toBe(expected);
  });

  it('uses priority TRUE_TO_SIZE > RUNS_SMALL > RUNS_LARGE for ties', () => {
    const trueToSizeTie = service.aggregate([
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 2 },
      { fitFeedback: FitFeedback.RUNS_SMALL, count: 2 },
    ]);
    const smallLargeTie = service.aggregate([
      { fitFeedback: FitFeedback.RUNS_SMALL, count: 2 },
      { fitFeedback: FitFeedback.RUNS_LARGE, count: 2 },
    ]);
    const threeWayTie = service.aggregate([
      { fitFeedback: FitFeedback.RUNS_SMALL, count: 1 },
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 1 },
      { fitFeedback: FitFeedback.RUNS_LARGE, count: 1 },
    ]);

    expect(trueToSizeTie.assessment).toBe(FitFeedback.TRUE_TO_SIZE);
    expect(smallLargeTie.assessment).toBe(FitFeedback.RUNS_SMALL);
    expect(threeWayTie.assessment).toBe(FitFeedback.TRUE_TO_SIZE);
  });

  it('returns an explicit no-data result when there are no fit responses', () => {
    expect(service.aggregate([])).toEqual({
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

  it('ignores null feedback while preserving grouped counts', () => {
    const result = service.aggregate([
      { fitFeedback: null, count: 10 },
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 2 },
      { fitFeedback: FitFeedback.TRUE_TO_SIZE, count: 1 },
      { fitFeedback: FitFeedback.RUNS_LARGE, count: 1 },
    ]);

    expect(result).toEqual({
      assessment: FitFeedback.TRUE_TO_SIZE,
      distribution: {
        RUNS_SMALL: 0,
        TRUE_TO_SIZE: 3,
        RUNS_LARGE: 1,
      },
      totalResponses: 4,
      hasData: true,
    });
  });

  it('treats null-only grouped rows as no data', () => {
    expect(service.aggregate([{ fitFeedback: null, count: 5 }])).toMatchObject({
      assessment: null,
      totalResponses: 0,
      hasData: false,
    });
  });
});
