import { Module } from '@nestjs/common';
import { SegmentsService } from './segments.service.js';
import { SegmentsController } from './segments.controller.js';

@Module({
  providers: [SegmentsService],
  controllers: [SegmentsController],
  exports: [SegmentsService]
})
export class SegmentsModule {}
