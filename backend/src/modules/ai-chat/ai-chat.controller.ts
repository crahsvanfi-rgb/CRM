import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { AiChatService } from './ai-chat.service.js';
import { CreateConversationDto, UpdateConversationDto, SendMessageDto } from './dto/ai-chat.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Throttle } from '@nestjs/throttler';

@Controller('ai-chat/conversations')
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente', 'Vendedor') // Todos pueden usar el agente IA, pero el ToolsService limitará lo que ven
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async createConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') usuarioId: string,
    @Body() dto?: CreateConversationDto
  ) {
    if (!tenantId || !usuarioId) throw new BadRequestException('x-tenant-id y x-user-id requeridos');
    return this.aiChatService.createConversation(tenantId, usuarioId, dto?.titulo);
  }

  @Get()
  async getConversations(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') usuarioId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!tenantId || !usuarioId) throw new BadRequestException('x-tenant-id y x-user-id requeridos');
    return this.aiChatService.getConversations(tenantId, usuarioId, Number(page || 1), Number(limit || 20));
  }

  @Get(':id')
  async getConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id requerido');
    return this.aiChatService.getConversation(tenantId, id);
  }

  @Patch(':id')
  async updateConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id requerido');
    return this.aiChatService.updateConversation(tenantId, id, dto.titulo);
  }

  @Delete(':id')
  async deleteConversation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id requerido');
    return this.aiChatService.deleteConversation(tenantId, id);
  }

  @Post(':id/messages')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async sendMessage(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') usuarioId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto
  ) {
    if (!tenantId || !usuarioId) throw new BadRequestException('x-tenant-id y x-user-id requeridos');
    return this.aiChatService.sendMessage(tenantId, usuarioId, conversationId, dto.contenido);
  }
}
