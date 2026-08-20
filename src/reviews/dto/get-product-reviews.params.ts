import { IsUUID } from 'class-validator';

export class GetProductReviewsParams {
  @IsUUID('all', { message: 'productId must be a valid UUID' })
  productId!: string;
}