import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { OptOutService } from './opt-out.service.js';
import { CreateOptOutDto } from './dto/opt-out.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ContactType } from '@prisma/client';

@Controller('opt-out')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OptOutController {
  constructor(private readonly optOutService: OptOutService) {}

  @Post()
  addOptOut(@Request() req: any, @Body() dto: CreateOptOutDto) {
    return this.optOutService.addOptOut(req.user.tenantId, req.user.id, dto);
  }

  @Delete(':contactoId')
  removeOptOut(
    @Request() req: any,
    @Param('contactoId') contactoId: string,
    @Query('tipoContacto') tipoContacto?: ContactType,
  ) {
    return this.optOutService.removeOptOut(req.user.tenantId, req.user.id, contactoId, tipoContacto);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.optOutService.findAll(req.user.tenantId, query);
  }
}
