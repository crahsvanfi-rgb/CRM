import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { SegmentsService } from './segments.service.js';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segment.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('segments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Post()
  create(@Request() req: any, @Body() createSegmentDto: CreateSegmentDto) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden crear segmentos');
    }
    return this.segmentsService.create(req.user.tenantId, createSegmentDto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.segmentsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.segmentsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updateSegmentDto: UpdateSegmentDto) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar segmentos');
    }
    return this.segmentsService.update(req.user.tenantId, id, updateSegmentDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden eliminar segmentos');
    }
    return this.segmentsService.remove(req.user.tenantId, id);
  }

  @Post(':id/preview')
  preview(@Request() req: any, @Param('id') id: string) {
    return this.segmentsService.preview(req.user.tenantId, id);
  }
}

