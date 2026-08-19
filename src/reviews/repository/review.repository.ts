import { Injectable } from '@nestjs/common';
import { Review } from '@prisma/client';
import { FitFeedback } from '../../common/enums/fit-feedback.enum';
import { FitFeedbackCount } from '../../fit/fit.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from '../dto/create-review.dto';

@Injectable()
export class ReviewRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: CreateReviewDto): Promise<Review> {
    return this.prismaService.review.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        fitFeedback: data.fitFeedback ?? null,
      },
    });
  }

  /** F1 (#9): count active (non-soft-deleted) reviews for a product. */
  countByProduct(productId: string): Promise<number> {
    return this.prismaService.review.count({
      where: { productId, isDeleted: false },
    });
  }

  async groupByFitFeedback(productId: string): Promise<FitFeedbackCount[]> {
    const rows = await this.prismaService.review.groupBy({
      by: ['fitFeedback'],
      where: { productId, isDeleted: false },
      _count: { _all: true },
    });

    return rows.map((row) => ({
      fitFeedback:
        row.fitFeedback === null ? null : FitFeedback[row.fitFeedback],
      count: row._count._all,
    }));
  }

  /**
   * Product existence check with a narrow select — used for 404 semantics
   * without materialising the whole row.
   */
  productExists(productId: string): Promise<boolean> {
    return this.prismaService.product
      .findUnique({ where: { id: productId }, select: { id: true } })
      .then((product) => product !== null);
  }
}
