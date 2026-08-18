import { Controller, Get } from '@nestjs/common';
import { HealthResult, HealthService } from './health.service';

/** GET /health — DB connectivity check (see 01-system-design.md §8). */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthResult> {
    return this.healthService.check();
  }
}
