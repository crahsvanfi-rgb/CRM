import { Controller, Get, Put, Body, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { ChatbotConfigService } from './chatbot-config.service.js';
import { ChatbotConfigDto } from './dto/chatbot-config.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { UserId } from '../../common/decorators/user-id.decorator.js';

@Controller('chatbot-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatbotConfigController {
  constructor(private readonly chatbotConfigService: ChatbotConfigService) {}

  @Get()
  @Roles('Admin', 'Gerente')
  getConfig(@TenantId() tenantId: string) {
    return this.chatbotConfigService.getConfig(tenantId);
  }

  @Put()
  @Roles('Admin', 'Gerente')
  updateConfig(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: ChatbotConfigDto
  ) {
    return this.chatbotConfigService.updateConfig(tenantId, userId, dto);
  }

  @Post('test-connection')
  @Roles('Admin', 'Gerente')
  testConnection(@TenantId() tenantId: string) {
    return this.chatbotConfigService.testConnection(tenantId);
  }

  @Post('test')
  @Roles('Admin', 'Gerente')
  testChatbot(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body('mensaje') mensaje: string
  ) {
    return this.chatbotConfigService.testChatbot(tenantId, userId, mensaje);
  }

  @Patch('activate')
  @Roles('Admin', 'Gerente')
  activate(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body('activo') activo: boolean
  ) {
    return this.chatbotConfigService.activate(tenantId, userId, activo);
  }

  @Delete()
  @Roles('Admin', 'Gerente')
  reset(@TenantId() tenantId: string, @UserId() userId: string) {
    return this.chatbotConfigService.reset(tenantId, userId);
  }
}
