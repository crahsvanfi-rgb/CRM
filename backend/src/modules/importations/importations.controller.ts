import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Headers, Res, UseGuards } from '@nestjs/common';
import { ImportationsService } from './importations.service.js';
import { CreateImportationDto, UpdateImportationDto } from './dto/importation.dto.js';
import { ImportationStatus } from '@prisma/client';
import type { Response } from 'express';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('importations')
export class ImportationsController {
  constructor(private readonly importationsService: ImportationsService) {}

  @Post()
  create(@Headers('x-tenant-id') tenantId: string, @Body() createImportationDto: CreateImportationDto) {
    return this.importationsService.create(tenantId, createImportationDto);
  }

  @Get()
  findAll(@Headers('x-tenant-id') tenantId: string, @Query() query: any) {
    return this.importationsService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.importationsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() updateImportationDto: UpdateImportationDto
  ) {
    return this.importationsService.update(tenantId, id, updateImportationDto);
  }

  @Delete(':id')
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.importationsService.remove(tenantId, id);
  }

  @Post(':id/transition')
  transitionState(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('newState') newState: ImportationStatus
  ) {
    return this.importationsService.transitionState(tenantId, id, newState);
  }

  @Post(':id/receive')
  receive(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string
  ) {
    return this.importationsService.receive(tenantId, userId, id);
  }

  @Post(':id/close')
  close(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.importationsService.close(tenantId, id);
  }

  @Get(':id/pdf')
  async getPdf(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.importationsService.generatePdf(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="importation-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
