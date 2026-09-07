import { Module } from '@nestjs/common';
import { ZeniorConfigController } from './zenior-config.controller.js';
import { ZeniorWebhookController } from './zenior-webhook.controller.js';
import { ZeniorWebhookService } from './zenior-webhook.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiChatModule } from '../ai-chat/ai-chat.module.js';
import { ConversationsModule } from '../conversations/conversations.module.js';

@Module({
  imports: [PrismaModule, AiChatModule, ConversationsModule],
  controllers: [ZeniorConfigController, ZeniorWebhookController],
  providers: [ZeniorWebhookService],
  exports: [ZeniorWebhookService],
})
export class ZeniorModule {}
