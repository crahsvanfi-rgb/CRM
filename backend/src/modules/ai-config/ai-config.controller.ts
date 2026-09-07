import { Controller, Get, Put, Post, Delete, Body, Headers, UseGuards, BadRequestException } from '@nestjs/common';
import { AiConfigService } from './ai-config.service.js';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller(['ai-config', 'api/ai-config'])
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente')
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get()
  async getConfig(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.aiConfigService.getConfig(tenantId);
  }

  @Put()
  async updateConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateAiConfigDto,
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.aiConfigService.updateConfig(tenantId, dto);
  }

  @Post('test')
  async testConnection(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.aiConfigService.testConnection(tenantId);
  }

  @Delete()
  async resetConfig(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.aiConfigService.resetConfig(tenantId);
  }
}
