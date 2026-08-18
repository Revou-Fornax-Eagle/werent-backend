import { Injectable } from '@nestjs/common';
import { Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findById(productId: string): Promise<Product | null> {
    return this.prismaService.product.findUnique({
      where: { id: productId },
    });
  }
}
