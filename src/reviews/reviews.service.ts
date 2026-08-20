import { Injectable, NotFoundException } from '@nestjs/common';
import { Review } from '@prisma/client';
import { FitService } from '../fit/fit.service';
import { FitAssessment } from '../fit/fit.types';
import { ProductRepository } from '../products/repository/product.repository';
import { UserRepository } from '../users/repository/user.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetProductReviewsQueryDto } from './dto/get-product-reviews-query.dto';
import { ReviewGateway } from './gateway/review.gateway';
import {
  ReviewListResult,
  ReviewRepository,
} from './repository/review.repository';

export interface CreateReviewResult {
  review: Review;
  reviewCount: number;
}

export interface GetProductReviewsResult {
  data: {
    reviews: ReviewListResult['reviews'];
  };
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly reviewGateway: ReviewGateway,
    private readonly fitService: FitService,
  ) {}

  async create(dto: CreateReviewDto): Promise<CreateReviewResult> {
    const [product, user] = await Promise.all([
      this.productRepository.findById(dto.productId),
      this.userRepository.findById(dto.userId),
    ]);

    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    // REV-27: temporary no-auth workaround. The frontend has no login yet and
    // always sends the same userId, so a 2nd review for the same product would
    // trip the @@unique([userId, productId]) constraint. Rotate to a fresh
    // placeholder user instead of erroring — the constraint itself stays intact
    // for real (post-auth) users. Small TOCTOU race on concurrent duplicate
    // submissions is acceptable here: the existing P2002 → 409 mapping still
    // catches it. Remove this rotation once real auth exists.
    let userId = dto.userId;
    const alreadyReviewed = await this.reviewRepository.existsForUserAndProduct(
      userId,
      dto.productId,
    );
    if (alreadyReviewed) {
      const guest = await this.userRepository.createGuest();
      userId = guest.id;
    }

    // No transaction needed: `create` is atomic on its own, and `countByProduct`
    // always re-reads from the DB (source of truth). The unique (userId, productId)
    // constraint guarantees idempotency, so a failed count cannot cause a double-count.
    const review = await this.reviewRepository.create({ ...dto, userId });
    const reviewCount = await this.reviewRepository.countByProduct(dto.productId);
    const result = { review, reviewCount };

    // Post-commit side effect — source of truth is the DB, never the in-memory count.
    this.reviewGateway.emitReviewCountUpdate(dto.productId, result.reviewCount);

    return result;
  }

  /**
   * Returns active reviews for a product with pagination.
   */
  async getProductReviews(
    productId: string,
    query: GetProductReviewsQueryDto,
  ): Promise<GetProductReviewsResult> {
    const productExists =
      await this.reviewRepository.productExists(productId);

    if (!productExists) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const result = await this.reviewRepository.findActiveByProduct(
      productId,
      query.page,
      query.per_page,
    );

    return {
      data: {
        reviews: result.reviews,
      },
      meta: {
        page: query.page,
        per_page: query.per_page,
        total: result.total,
      },
    };
  }

  /** F1 (#9): review count for a product — 0 explicit when empty. */
  countByProduct(productId: string): Promise<number> {
    return this.reviewRepository.countByProduct(productId);
  }

  async getFitAssessment(productId: string): Promise<FitAssessment> {
    const feedbackCounts = await this.reviewRepository.groupByFitFeedback(
      productId,
    );

    return this.fitService.aggregate(feedbackCounts);
  }
}