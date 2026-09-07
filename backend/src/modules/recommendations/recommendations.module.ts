import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationEngineService } from './recommendation-engine.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [RecommendationEngineService],
  exports: [RecommendationEngineService],
})
export class RecommendationsModule {}
