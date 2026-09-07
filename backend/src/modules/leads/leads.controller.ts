import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpCode,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { CreateLeadTouchpointDto } from './dto/create-touchpoint.dto.js';
import { UpdateLeadTouchpointDto } from './dto/update-touchpoint.dto.js';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller(['leads', 'api/leads'])
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  private getTenantId(req: any): string {
    return req.headers['x-tenant-id'] || req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
  }

  private getUserId(req: any): string {
    return req.headers['x-user-id'] || req.user?.id || req.user?.sub || '00000000-0000-0000-0000-000000000000';
  }

  @Post()
  create(@Body() createLeadDto: CreateLeadDto, @Req() req: any) {
    return this.leadsService.create(createLeadDto, this.getTenantId(req), this.getUserId(req));
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('estado') estado: string,
    @Query('search') search: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.leadsService.findAll(this.getTenantId(req), pageNum, limitNum, estado, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.leadsService.findOne(id, this.getTenantId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Req() req: any) {
    return this.leadsService.update(id, updateLeadDto, this.getTenantId(req));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.leadsService.remove(id, this.getTenantId(req));
  }

  @Post(':id/convert')
  @HttpCode(200)
  convert(@Param('id') id: string, @Req() req: any) {
    return this.leadsService.convertToCustomer(id, this.getTenantId(req));
  }

  @Post(':id/activities')
  createActivity(@Param('id') id: string, @Body() createActivityDto: CreateActivityDto, @Req() req: any) {
    return { status: 'Not implemented yet' };
  }

  // ----------------------------------------------------
  // HISTORIAL DE SEGUIMIENTO (TOUCHPOINTS)
  // ----------------------------------------------------

  @Post(':id/touchpoints')
  createTouchpoint(
    @Param('id') id: string,
    @Body() dto: CreateLeadTouchpointDto,
    @Req() req: any,
  ) {
    return this.leadsService.createTouchpoint(id, dto, this.getTenantId(req), this.getUserId(req));
  }

  @Get(':id/touchpoints')
  findTouchpoints(@Param('id') id: string, @Req() req: any) {
    return this.leadsService.findTouchpoints(id, this.getTenantId(req));
  }

  @Patch(':id/touchpoints/:touchpointId')
  updateTouchpoint(
    @Param('id') id: string,
    @Param('touchpointId') touchpointId: string,
    @Body() dto: UpdateLeadTouchpointDto,
    @Req() req: any,
  ) {
    return this.leadsService.updateTouchpoint(id, touchpointId, dto, this.getTenantId(req));
  }

  @Delete(':id/touchpoints/:touchpointId')
  @HttpCode(204)
  removeTouchpoint(
    @Param('id') id: string,
    @Param('touchpointId') touchpointId: string,
    @Req() req: any,
  ) {
    return this.leadsService.removeTouchpoint(id, touchpointId, this.getTenantId(req));
  }
}
