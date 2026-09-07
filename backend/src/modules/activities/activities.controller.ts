import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';
import { QueryActivityDto } from './dto/query-activity.dto.js';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Request() req: any, @Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create((req.headers['x-tenant-id'] || req.user?.tenantId), createActivityDto);
  }

  @Post('from-chat')
  createFromChat(@Request() req: any, @Body() body: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || body.tenantId || '00000000-0000-0000-0000-000000000000';
    return this.activitiesService.createFromChat(tenantId, body);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: QueryActivityDto) {
    return this.activitiesService.findAll((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get('calendar')
  getCalendar(@Request() req: any, @Query('fechaInicio') fechaInicio: string, @Query('fechaFin') fechaFin: string) {
    return this.activitiesService.getCalendar((req.headers['x-tenant-id'] || req.user?.tenantId), fechaInicio, fechaFin);
  }

  @Get('history')
  getHistory(@Request() req: any, @Query() query: any) {
    return this.activitiesService.getHistory((req.headers['x-tenant-id'] || req.user?.tenantId), query);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.findOne((req.headers['x-tenant-id'] || req.user?.tenantId), id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
    return this.activitiesService.update((req.headers['x-tenant-id'] || req.user?.tenantId), id, updateActivityDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.remove((req.headers['x-tenant-id'] || req.user?.tenantId), id);
  }

  @Post(':id/complete')
  complete(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.complete((req.headers['x-tenant-id'] || req.user?.tenantId), id);
  }

  @Post(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.cancel((req.headers['x-tenant-id'] || req.user?.tenantId), id);
  }
}
