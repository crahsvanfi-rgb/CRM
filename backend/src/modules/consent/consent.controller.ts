import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ConsentService } from './consent.service.js';
import { RegisterConsentDto } from './dto/consent.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ContactType } from '@prisma/client';

@Controller('consent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  registerConsent(@Request() req: any, @Body() dto: RegisterConsentDto) {
    return this.consentService.registerConsent(req.user.tenantId, req.user.id, dto);
  }

  @Get('status/:contactoId')
  getStatus(
    @Request() req: any,
    @Param('contactoId') contactoId: string,
    @Query('tipoContacto') tipoContacto?: ContactType,
  ) {
    return this.consentService.getConsentStatus(req.user.tenantId, contactoId, tipoContacto);
  }
}
