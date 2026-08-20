import { FitFeedback } from '../common/enums/fit-feedback.enum';

export interface ReviewListItem {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  fitFeedback: FitFeedback | null;
  createdAt: Date;
}
