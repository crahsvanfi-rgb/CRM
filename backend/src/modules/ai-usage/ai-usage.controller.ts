import { Controller, Get, Post, Body, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service.js';
import { CreateAiUsageDto } from './dto/create-ai-usage.dto.js';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard.js';

@Controller('ai-usage')
@UseGuards(JwtAuthGuard)
export class AiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  @Get()
  async getUsage(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userRole = req.user.role?.name;
    
    return this.aiUsageService.getUsage(tenantId, query, userId, userRole);
  }

  @Get('summary')
  async getSummary(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userRole = req.user.role?.name;
    
    return this.aiUsageService.getSummary(tenantId, query, userId, userRole);
  }

  @Get('cost-per-tenant')
  async getCostPerTenant(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role?.name;
    
    if (userRole !== 'Admin' && userRole !== 'Gerente') {
      throw new ForbiddenException('Solo administradores pueden ver costos por tenant');
    }
    
    const summary = await this.aiUsageService.getSummary(tenantId, query);
    return {
      tenantId,
      costoTotal: summary.global.costoTotal,
      periodo: {
        inicio: query.fechaInicio || 'all',
        fin: query.fechaFin || 'all'
      }
    };
  }

  @Post('record')
  async recordUsage(@Req() req: any, @Body() dto: CreateAiUsageDto) {
    const tenantId = req.user.tenantId;
    return this.aiUsageService.recordUsage(tenantId, dto);
  }
}
