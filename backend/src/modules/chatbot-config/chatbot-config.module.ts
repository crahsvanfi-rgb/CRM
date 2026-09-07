import { Module } from '@nestjs/common';
import { ChatbotConfigController } from './chatbot-config.controller.js';
import { ChatbotConfigService } from './chatbot-config.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiChatModule } from '../ai-chat/ai-chat.module.js';

@Module({
  imports: [PrismaModule, AiChatModule],
  controllers: [ChatbotConfigController],
  providers: [ChatbotConfigService],
  exports: [ChatbotConfigService]
})
export class ChatbotConfigModule {}
