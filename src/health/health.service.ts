import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthResult {
  status: string;
  db: string;
}

/**
 * Health check — verifies DB connectivity via a raw SELECT 1.
 * Reference: docs/architecture/01-system-design.md §8
 */
@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async check(): Promise<HealthResult> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      return { status: 'degraded', db: 'down' };
    }
  }
}
