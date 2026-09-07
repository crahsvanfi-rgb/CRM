import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller.js';
import { AiChatService } from './ai-chat.service.js';
import { AiToolsService } from './ai-tools.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiConfigModule } from '../ai-config/ai-config.module.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { AiUsageModule } from '../ai-usage/ai-usage.module.js';

@Module({
  imports: [PrismaModule, AiConfigModule, AiUsageModule],
  controllers: [AiChatController],
  providers: [AiChatService, AiToolsService, EncryptionService],
  exports: [AiChatService, AiToolsService, EncryptionService],
})
export class AiChatModule {}
