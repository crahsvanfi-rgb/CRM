import { Module } from '@nestjs/common';
import { ZernioController } from './zernio.controller.js';
import { ZernioWebhookController } from './zernio-webhook.controller.js';
import { ZernioService } from './zernio.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiChatModule } from '../ai-chat/ai-chat.module.js';
import { EncryptionService } from '../../common/services/encryption.service.js';

@Module({
  imports: [PrismaModule, AiChatModule],
  controllers: [ZernioController, ZernioWebhookController],
  providers: [ZernioService, EncryptionService],
  exports: [ZernioService],
})
export class ZernioModule {}
