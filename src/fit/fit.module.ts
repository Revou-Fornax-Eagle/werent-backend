import { Module } from '@nestjs/common';
import { FitService } from './fit.service';

@Module({
  providers: [FitService],
  exports: [FitService],
})
export class FitModule {}
