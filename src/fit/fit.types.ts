import { FitFeedback } from '../common/enums/fit-feedback.enum';

export interface FitFeedbackCount {
  fitFeedback: FitFeedback | null;
  count: number;
}

export interface FitDistribution {
  RUNS_SMALL: number;
  TRUE_TO_SIZE: number;
  RUNS_LARGE: number;
}

export interface FitAssessment {
  assessment: FitFeedback | null;
  distribution: FitDistribution;
  totalResponses: number;
  hasData: boolean;
}
