import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Data access for users — DB queries only.
 * Minimal for this sprint: lookup used to validate the reviewer identity (ADR-004).
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { id } });
  }
}
