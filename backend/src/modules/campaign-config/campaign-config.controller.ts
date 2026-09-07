import { Controller, Get, Put, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { CampaignConfigService } from './campaign-config.service.js';
import { UpsertCampaignConfigDto } from './dto/campaign-config.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('campaign-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignConfigController {
  constructor(private readonly campaignConfigService: CampaignConfigService) {}

  @Get()
  getConfig(@Request() req: any) {
    return this.campaignConfigService.getConfig(req.user.tenantId);
  }

  @Put()
  upsertConfig(@Request() req: any, @Body() dto: UpsertCampaignConfigDto) {
    return this.campaignConfigService.upsertConfig(req.user.tenantId, req.user.id, req.user.role, dto);
  }

  @Patch('toggle')
  toggleCampanas(@Request() req: any, @Body('active') active?: boolean) {
    return this.campaignConfigService.toggleCampanas(req.user.tenantId, req.user.id, req.user.role, active);
  }
}
