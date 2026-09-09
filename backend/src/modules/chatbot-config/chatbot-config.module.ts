import { Module } from '@nestjs/common';
import { ChatbotConfigController } from './chatbot-config.controller.js';
import { ChatbotConfigService } from './chatbot-config.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiChatModule } from '../ai-chat/ai-chat.module.js';
import { EncryptionService } from '../../common/services/encryption.service.js';

@Module({
  imports: [PrismaModule, AiChatModule],
  controllers: [ChatbotConfigController],
  providers: [ChatbotConfigService, EncryptionService],
  exports: [ChatbotConfigService]
})
export class ChatbotConfigModule {}
