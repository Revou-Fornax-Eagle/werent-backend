import { Controller, Get, Param } from '@nestjs/common';
import { GetProductParams } from './dto/get-product.params';
import { ProductDetailResponse, ProductsService } from './products.service';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Product detail with review count and fit assessment (issues #9, #16). */
  @Get(':productId')
  getProductDetail(
    @Param() params: GetProductParams,
  ): Promise<ProductDetailResponse> {
    return this.productsService.getProductDetail(params.productId);
  }
}
