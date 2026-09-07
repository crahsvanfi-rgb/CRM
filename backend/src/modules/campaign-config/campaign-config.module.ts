import { Module } from '@nestjs/common';
import { CampaignConfigService } from './campaign-config.service.js';
import { CampaignConfigController } from './campaign-config.controller.js';

@Module({
  controllers: [CampaignConfigController],
  providers: [CampaignConfigService],
  exports: [CampaignConfigService],
})
export class CampaignConfigModule {}
