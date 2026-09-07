import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service.js';
import { 
  CreateCampaignDto, 
  UpdateCampaignDto, 
  AddRecipientsDto, 
  AddSegmentRecipientsDto, 
  UpdateVelocityDto,
  AutoRecoverInactiveDto,
  AutoProductDto,
  AutoVendorDto,
  ProcessResponseDto
} from './dto/campaign.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CampaignStatus } from '@prisma/client';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Request() req: any, @Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignsService.create(req.user.tenantId, req.user.id, req.user.role, createCampaignDto);
  }

  @Get('board')
  getBoard(@Request() req: any, @Query() query: any) {
    return this.campaignsService.getBoard(req.user.tenantId, req.user.role, req.user.id, query);
  }

  @Post('auto/recover-inactive')
  createAutoRecovery(@Request() req: any, @Body() dto: AutoRecoverInactiveDto) {
    return this.campaignsService.createAutoRecoveryCampaign(req.user.tenantId, req.user.id, req.user.role, dto);
  }

  @Post('auto/product')
  createAutoProduct(@Request() req: any, @Body() dto: AutoProductDto) {
    return this.campaignsService.createAutoProductCampaign(req.user.tenantId, req.user.id, req.user.role, dto);
  }

  @Post('auto/vendor')
  createAutoVendor(@Request() req: any, @Body() dto: AutoVendorDto) {
    return this.campaignsService.createAutoVendorCampaign(req.user.tenantId, req.user.id, req.user.role, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.campaignsService.findAll(req.user.tenantId, req.user.id, req.user.role);
  }

  @Get(':id/summary')
  getSummary(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getSummary(req.user.tenantId, id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.findOne(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignsService.update(req.user.tenantId, req.user.id, req.user.role, id, updateCampaignDto);
  }

  @Post(':id/duplicate')
  duplicate(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.duplicate(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/pause')
  pause(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.changeStatus(req.user.tenantId, req.user.id, req.user.role, id, CampaignStatus.PAUSADA);
  }

  @Post(':id/resume')
  resume(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.changeStatus(req.user.tenantId, req.user.id, req.user.role, id, CampaignStatus.PROGRAMADA);
  }

  @Post(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.changeStatus(req.user.tenantId, req.user.id, req.user.role, id, CampaignStatus.CANCELADA);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.remove(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Get(':id/recipients')
  getRecipients(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getRecipients(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/recipients/manual')
  addManualRecipients(@Request() req: any, @Param('id') id: string, @Body() addRecipientsDto: AddRecipientsDto) {
    return this.campaignsService.addManualRecipients(req.user.tenantId, req.user.id, req.user.role, id, addRecipientsDto);
  }

  @Post(':id/recipients/segment')
  addSegmentRecipients(@Request() req: any, @Param('id') id: string, @Body() dto: AddSegmentRecipientsDto) {
    return this.campaignsService.addSegmentRecipients(req.user.tenantId, req.user.id, req.user.role, id, dto.segmentId);
  }

  @Delete(':id/recipients/:recipientId')
  removeRecipient(@Request() req: any, @Param('id') id: string, @Param('recipientId') recipientId: string) {
    return this.campaignsService.removeRecipient(req.user.tenantId, req.user.id, req.user.role, id, recipientId);
  }

  @Post(':id/prepare')
  prepare(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.prepare(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/approve')
  approve(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.approve(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/schedule')
  schedule(@Request() req: any, @Param('id') id: string, @Body('fechaEnvioProgramado') fecha: string) {
    return this.campaignsService.schedule(req.user.tenantId, req.user.id, req.user.role, id, fecha);
  }

  @Post(':id/start')
  start(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.start(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Get(':id/messages')
  getMessages(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getMessages(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/retry-failed')
  retryFailed(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.retryFailed(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/generate-message')
  generateMessage(@Request() req: any, @Param('id') id: string, @Body('prompt') prompt: string) {
    return this.campaignsService.generateMessage(req.user.tenantId, req.user.id, req.user.role, id, prompt);
  }

  @Patch(':id/velocity')
  updateVelocity(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateVelocityDto) {
    return this.campaignsService.updateVelocity(req.user.tenantId, req.user.role, id, dto);
  }

  @Get(':id/velocity')
  getVelocity(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getVelocity(req.user.tenantId, id);
  }

  @Get(':id/stats')
  getStats(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getStats(req.user.tenantId, id);
  }

  @Post(':id/process-response')
  processResponse(@Request() req: any, @Param('id') id: string, @Body() dto: ProcessResponseDto) {
    return this.campaignsService.processResponse(req.user.tenantId, id, dto.recipientId, dto.mensaje);
  }

  @Post(':id/simulate-response')
  simulateResponse(@Request() req: any, @Param('id') id: string, @Body('recipientId') recipientId: string, @Body('mensaje') mensaje: string) {
    return this.campaignsService.processResponse(req.user.tenantId, id, recipientId, mensaje);
  }

  @Get(':id/costs')
  getCosts(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getCosts(req.user.tenantId, req.user.id, req.user.role, id);
  }

  @Post(':id/costs/calculate')
  calculateCosts(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.calculateCosts(req.user.tenantId, req.user.id, req.user.role, id);
  }
}

