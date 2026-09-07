import { Module } from '@nestjs/common';
import { ConsentService } from './consent.service.js';
import { ConsentController } from './consent.controller.js';

@Module({
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
