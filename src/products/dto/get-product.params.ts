import { IsUUID } from 'class-validator';

/** Path param validation for GET /api/products/:productId */
export class GetProductParams {
  @IsUUID('all', { message: 'productId must be a valid UUID' })
  productId!: string;
}
