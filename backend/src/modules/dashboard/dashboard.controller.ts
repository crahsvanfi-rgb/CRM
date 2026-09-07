import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles('Admin', 'Gerente')
  getSummary(@Request() req: any, @Query() query: DashboardQueryDto) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.dashboardService.getSummary(tenantId, query);
  }

  @Get('marketing-summary')
  @Roles('Admin', 'Gerente', 'Vendedor')
  getMarketingSummary(@Request() req: any, @Query() query: DashboardQueryDto) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const userId = req.headers['x-user-id'] || req.user?.id;
    const userRole = req.headers['x-role'] || req.user?.role?.name || req.user?.role;
    return this.dashboardService.getMarketingSummary(tenantId, userId, userRole, query);
  }
}
