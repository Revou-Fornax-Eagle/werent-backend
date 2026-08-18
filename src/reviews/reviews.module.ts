import { Module, forwardRef } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { ReviewGateway } from './gateway/review.gateway';
import { ReviewRepository } from './repository/review.repository';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [forwardRef(() => ProductsModule), UsersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewRepository, ReviewGateway],
  exports: [ReviewsService, ReviewRepository],
})
export class ReviewsModule {}
