import { Injectable } from '@nestjs/common';
import { FitFeedback } from '../common/enums/fit-feedback.enum';
import {
  FitAssessment,
  FitDistribution,
  FitFeedbackCount,
} from './fit.types';

@Injectable()
export class FitService {
  /** Earlier entries win when multiple values share the highest count. */
  private static readonly TIE_BREAK_ORDER: readonly FitFeedback[] = [
    FitFeedback.TRUE_TO_SIZE,
    FitFeedback.RUNS_SMALL,
    FitFeedback.RUNS_LARGE,
  ];

  aggregate(feedbackCounts: readonly FitFeedbackCount[]): FitAssessment {
    const distribution = this.buildDistribution(feedbackCounts);
    const totalResponses = Object.values(distribution).reduce(
      (total, count) => total + count,
      0,
    );

    if (totalResponses === 0) {
      return {
        assessment: null,
        distribution,
        totalResponses,
        hasData: false,
      };
    }

    return {
      assessment: this.majorityVote(distribution),
      distribution,
      totalResponses,
      hasData: true,
    };
  }

  private buildDistribution(
    feedbackCounts: readonly FitFeedbackCount[],
  ): FitDistribution {
    const distribution: FitDistribution = {
      RUNS_SMALL: 0,
      TRUE_TO_SIZE: 0,
      RUNS_LARGE: 0,
    };

    for (const { fitFeedback, count } of feedbackCounts) {
      if (fitFeedback !== null) {
        distribution[fitFeedback] += count;
      }
    }

    return distribution;
  }

  private majorityVote(distribution: FitDistribution): FitFeedback {
    const highestCount = Math.max(...Object.values(distribution));
    const winner = FitService.TIE_BREAK_ORDER.find(
      (fitFeedback) => distribution[fitFeedback] === highestCount,
    );

    // aggregate() only calls this method when at least one response exists.
    if (winner === undefined) {
      throw new Error('Unable to determine fit assessment');
    }

    return winner;
  }
}
