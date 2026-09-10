import { Controller, Get, Put, Body, Post, Patch, Delete, Headers, UseGuards, BadRequestException } from '@nestjs/common';
import { ChatbotConfigService } from './chatbot-config.service.js';
import { ChatbotConfigDto } from './dto/chatbot-config.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('chatbot-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatbotConfigController {
  constructor(private readonly chatbotConfigService: ChatbotConfigService) {}

  @Get()
  @Roles('Admin', 'Gerente')
  getConfig(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.chatbotConfigService.getConfig(tenantId);
  }

  @Put()
  @Roles('Admin', 'Gerente')
  updateConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: ChatbotConfigDto
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.chatbotConfigService.updateConfig(tenantId, userId, dto);
  }

  @Post('test-connection')
  @Roles('Admin', 'Gerente')
  testConnection(@Headers('x-tenant-id') tenantId: string, @Body() dto?: ChatbotConfigDto) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.chatbotConfigService.testConnection(tenantId, dto);
  }

  @Post('test')
  @Roles('Admin', 'Gerente')
  testChatbot(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body('mensaje') mensaje: string
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.chatbotConfigService.testChatbot(tenantId, userId, mensaje);
  }

  @Patch('activate')
  @Roles('Admin', 'Gerente')
  activate(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body('activo') activo: boolean
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.chatbotConfigService.activate(tenantId, userId, activo);
  }

  @Delete()
  @Roles('Admin', 'Gerente')
  reset(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id es requerido');
    return this.chatbotConfigService.reset(tenantId, userId);
  }
}
