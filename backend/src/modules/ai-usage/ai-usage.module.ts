import { Module } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service.js';
import { AiUsageController } from './ai-usage.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AiUsageController],
  providers: [AiUsageService],
  exports: [AiUsageService]
})
export class AiUsageModule {}
