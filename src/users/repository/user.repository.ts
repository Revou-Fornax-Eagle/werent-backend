import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
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

  /**
   * REV-27: temporary no-auth workaround. Creates a throwaway placeholder
   * user so a review submission can get a fresh userId instead of colliding
   * on the (userId, productId) unique constraint. Remove once real
   * login/auth assigns a stable per-request userId.
   */
  createGuest(): Promise<User> {
    const id = randomUUID();
    return this.prismaService.user.create({
      data: {
        email: `guest-${id}@no-auth.local`,
        name: 'Guest',
      },
    });
  }
}
