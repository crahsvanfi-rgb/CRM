import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('reports')
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente', 'Vendedor')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-by-period')
  getSalesByPeriod(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getSalesByPeriod((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('sales-by-vendor')
  getSalesByVendor(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getSalesByVendor((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('sales-by-customer')
  getSalesByCustomer(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getSalesByCustomer((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('top-products')
  getTopProducts(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getTopProducts((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('least-products')
  getLeastProducts(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLeastProducts((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('stock-summary')
  getStockSummary(@Request() req: any) {
    return this.reportsService.getStockSummary((req.headers['x-tenant-id'] || req.user?.tenantId));
  }

  @Get('leads')
  getLeadsReport(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLeadsReport((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('lead-conversion')
  getLeadConversion(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLeadConversion((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('new-customers')
  getNewCustomers(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getNewCustomers((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('inactive-customers')
  getInactiveCustomers(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getInactiveCustomers((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('lead-funnel')
  getLeadFunnel(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLeadFunnel((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('lead-forecast')
  getLeadForecast(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLeadForecast((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('lead-loss-reasons')
  getLeadLossReasons(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getLeadLossReasons((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('importations')
  getImportationsReport(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getImportationsReport((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }
}
