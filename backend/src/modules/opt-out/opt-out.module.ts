import { Module } from '@nestjs/common';
import { OptOutService } from './opt-out.service.js';
import { OptOutController } from './opt-out.controller.js';

@Module({
  controllers: [OptOutController],
  providers: [OptOutService],
  exports: [OptOutService],
})
export class OptOutModule {}
