import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetProductReviewsParams } from './dto/get-product-reviews.params';
import { GetProductReviewsQueryDto } from './dto/get-product-reviews-query.dto';
import {
  CreateReviewResult,
  GetProductReviewsResult,
  ReviewsService,
} from './reviews.service';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** POST /api/reviews — create review + updated reviewCount (issue #9). */
  @Post()
  create(@Body() dto: CreateReviewDto): Promise<CreateReviewResult> {
    return this.reviewsService.create(dto);
  }

  /**
   * GET /api/reviews/product/:productId
   * Returns active reviews for a product with pagination.
   */
  @Get('product/:productId')
  getProductReviews(
    @Param() params: GetProductReviewsParams,
    @Query() query: GetProductReviewsQueryDto,
  ): Promise<GetProductReviewsResult> {
    return this.reviewsService.getProductReviews(
      params.productId,
      query,
    );
  }
}