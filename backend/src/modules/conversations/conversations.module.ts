import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { AudioTranscriptionService } from './audio-transcription.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiChatModule } from '../ai-chat/ai-chat.module.js';

@Module({
  imports: [PrismaModule, AiChatModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, AudioTranscriptionService],
  exports: [ConversationsService, AudioTranscriptionService]
})
export class ConversationsModule {}
