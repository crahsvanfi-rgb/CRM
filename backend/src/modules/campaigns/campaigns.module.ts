import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service.js';
import { CampaignsController } from './campaigns.controller.js';
import { CampaignsQueueService } from './campaigns-queue.service.js';
import { CampaignsAutomationService } from './campaigns-automation.service.js';
import { SegmentsModule } from '../segments/segments.module.js';
import { ZeniorModule } from '../zenior/zenior.module.js';

@Module({
  imports: [SegmentsModule, ZeniorModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsQueueService, CampaignsAutomationService],
  exports: [CampaignsService, CampaignsQueueService, CampaignsAutomationService],
})
export class CampaignsModule {}
