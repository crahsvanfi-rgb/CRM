import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TranscriptionStatus, ConversationMode } from '@prisma/client';
import { AiChatService } from '../ai-chat/ai-chat.service.js';
// import { ZeniorWebhookService } from '../zenior/zenior-webhook.service.js';

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiChat: AiChatService
  ) {}

  async processTranscription(tenantId: string, conversationId: string, messageId: string, audioUrl: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    try {
      this.logger.log(`Iniciando transcripción para mensaje ${messageId} de audio ${audioUrl}`);

      // MOCK: Simular tiempo de procesamiento (3-5 segundos)
      await new Promise(resolve => setTimeout(resolve, 3000));
      const simulatedText = `[Transcripción simulada del audio ${audioUrl.substring(0, 10)}...] Cliente pidiendo información de productos.`;

      // 1. Guardar transcripción
      const updatedMsg = await tenantClient.message.update({
        where: { id: messageId },
        data: {
          transcription: simulatedText,
          transcripcionEstado: TranscriptionStatus.COMPLETADA,
          duracionSegundos: 12 // simulado
        }
      });

      // 2. Revisar si la IA debe responder
      const conv = await tenantClient.conversation.findUnique({
        where: { id: conversationId }
      });

      if (conv && conv.modo === ConversationMode.IA) {
        this.logger.log(`Conversación en modo IA. Enviando transcripción al agente...`);
        // Invocar a la IA
        try {
          const chatResponse = await this.aiChat.getChatResponse(tenantId, simulatedText, conversationId, {
            userName: conv.nombreContacto || 'Cliente',
            roleName: 'Cliente Externo',
            userId: conv.contactoId
          });

          // Aquí deberíamos enviar la respuesta por Zenior, pero para evitar dependencias circulares
          // lo simularemos guardando el mensaje de salida. 
          // En producción usaríamos un event emitter o inyección de dependencias.
          await tenantClient.message.create({
            data: {
              tenantId,
              conversationId: conv.id,
              senderType: 'BOT',
              direction: 'SALIENTE',
              messageType: 'TEXTO',
              content: chatResponse.reply,
              status: 'ENVIADO', // Simulado
              leido: true
            }
          });
          
          await tenantClient.conversation.update({
            where: { id: conv.id },
            data: {
              ultimoMensaje: chatResponse.reply,
              fechaUltimoMensaje: new Date()
            }
          });

        } catch (iaErr: any) {
          this.logger.error(`Error de IA al responder audio: ${iaErr.message}`);
        }
      } else {
        this.logger.log(`Conversación en modo HUMANO. Solo se transcribe, no se responde.`);
      }

    } catch (error: any) {
      this.logger.error(`Error transcribiendo audio ${messageId}: ${error.message}`);
      await tenantClient.message.update({
        where: { id: messageId },
        data: { transcripcionEstado: TranscriptionStatus.ERROR }
      });
    }
  }
}
