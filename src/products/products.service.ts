import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@prisma/client';
import { FitAssessment } from '../fit/fit.types';
import { ReviewsService } from '../reviews/reviews.service';
import { ProductRepository } from './repository/product.repository';

export interface ProductDetailResponse {
  product: Product;
  reviewCount: number;
  fitAssessment: FitAssessment;
}

/**
 * Product lookup + review aggregation orchestration for the PDP endpoint
 * (issues #9 and #16).
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

    const [reviewCount, fitAssessment] = await Promise.all([
      this.reviewsService.countByProduct(productId),
      this.reviewsService.getFitAssessment(productId),
    ]);

    return { product, reviewCount, fitAssessment };
  }
}
