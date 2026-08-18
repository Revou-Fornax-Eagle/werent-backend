import { Module, forwardRef } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module';
import { ProductsController } from './products.controller';
import { ProductRepository } from './repository/product.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [forwardRef(() => ReviewsModule)],
  controllers: [ProductsController],
  providers: [ProductsService, ProductRepository],
  exports: [ProductsService, ProductRepository],
})
export class ProductsModule {}
