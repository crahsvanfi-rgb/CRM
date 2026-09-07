import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConversationsService } from './conversations.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UpdateConversationStatusDto, SendMessageDto } from './dto/conversations.dto.js';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.conversationsService.findAll(req.user.tenantId, req.user.userId, req.user.roleName, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.conversationsService.findOne(req.user.tenantId, req.user.userId, req.user.roleName, id);
  }

  @Get(':id/messages')
  findMessages(@Req() req: any, @Param('id') id: string, @Query() query: any) {
    return this.conversationsService.findMessages(req.user.tenantId, id, query);
  }

  @Post(':id/messages')
  sendMessage(@Req() req: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversationsService.sendMessage(req.user.tenantId, req.user.userId, req.user.roleName, id, dto);
  }

  @Patch(':id/estado')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateConversationStatusDto) {
    return this.conversationsService.updateStatus(req.user.tenantId, id, dto);
  }

  @Get(':id/mode')
  getMode(@Req() req: any, @Param('id') id: string) {
    return this.conversationsService.getMode(req.user.tenantId, id);
  }

  @Post(':id/take-control')
  takeControl(@Req() req: any, @Param('id') id: string) {
    return this.conversationsService.takeControl(req.user.tenantId, req.user.userId, id);
  }

  @Post(':id/return-to-bot')
  returnToBot(@Req() req: any, @Param('id') id: string) {
    return this.conversationsService.returnToBot(req.user.tenantId, id);
  }

  @Post(':id/close')
  closeConversation(@Req() req: any, @Param('id') id: string) {
    return this.conversationsService.closeConversation(req.user.tenantId, id);
  }

  @Post(':id/mark-read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.conversationsService.markAsRead(req.user.tenantId, id);
  }

  @Post(':id/create-lead')
  createLead(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const userId = req.headers['x-user-id'] || req.user?.id || req.user?.userId;
    return this.conversationsService.createLeadFromConversation(tenantId, id, body, userId);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(@Req() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new Error('Archivo no subido');
    return this.conversationsService.uploadAttachment(req.user.tenantId, id, file);
  }

  @Post(':id/audio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(@Req() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new Error('Archivo de audio no subido');
    return this.conversationsService.uploadAudio(req.user.tenantId, req.user.userId, req.user.roleName, id, file);
  }

  @Get(':id/messages/:messageId/transcription')
  getTranscription(@Req() req: any, @Param('id') id: string, @Param('messageId') messageId: string) {
    return this.conversationsService.getTranscription(req.user.tenantId, id, messageId);
  }

  @Post(':id/messages/:messageId/retry-transcription')
  retryTranscription(@Req() req: any, @Param('id') id: string, @Param('messageId') messageId: string) {
    return this.conversationsService.retryTranscription(req.user.tenantId, req.user.userId, req.user.roleName, id, messageId);
  }
}
