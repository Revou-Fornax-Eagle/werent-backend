import { Body, Controller, Post } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReviewResult, ReviewsService } from './reviews.service';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** POST /api/reviews — create review + updated reviewCount (issue #9). */
  @Post()
  create(@Body() dto: CreateReviewDto): Promise<CreateReviewResult> {
    return this.reviewsService.create(dto);
  }
}
