import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@prisma/client';
import { ReviewsService } from '../reviews/reviews.service';
import { ProductRepository } from './repository/product.repository';

export interface ProductDetailResponse {
  product: Product;
  reviewCount: number;
}

/**
 * Product lookup + review count orchestration for the PDP endpoint (issue #9).
 * Fit assessment (issue #16) intentionally excluded — Epic RP-04, team.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly reviewsService: ReviewsService,
  ) {}

  async getProductDetail(productId: string): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    const reviewCount = await this.reviewsService.countByProduct(productId);

    return { product, reviewCount };
  }
}
