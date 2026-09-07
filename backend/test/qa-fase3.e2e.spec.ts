import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { ZeniorWebhookService } from '../src/modules/zenior/zenior-webhook.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AiUsageService } from '../src/modules/ai-usage/ai-usage.service.js';
import { AudioTranscriptionService } from '../src/modules/conversations/audio-transcription.service.js';
import { ExternalChannel } from '@prisma/client';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EncryptionService } from '../src/common/services/encryption.service.js';

describe('QA Final: Flujos E2E Fase 3', () => {
  let app: TestingModule;
  let webhookService: ZeniorWebhookService;
  let prisma: PrismaService;
  let encryption: EncryptionService;
  
  const TENANT_ID = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Mock global de fetch para simular OpenRouter y respuestas externas
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('openrouter.ai/api/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Respuesta simulada de IA', role: 'assistant' } }],
            usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    webhookService = app.get<ZeniorWebhookService>(ZeniorWebhookService);
    prisma = app.get<PrismaService>(PrismaService);
    encryption = app.get<EncryptionService>(EncryptionService);

    // Preparar DB (In-memory o SQLite para tests)
    const client = prisma.getTenantClient(TENANT_ID);
    
    // Crear el Tenant base para satisfacer la clave foránea
    await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: 'Tenant QA Fase 3', domain: 'qa3' }
    });
    
    // Configuración base necesaria
    await client.channelConnection.create({
      data: { tenantId: TENANT_ID, canal: ExternalChannel.ZENIOR_FACEBOOK, habilitado: true, configJson: { verify_token: '123', token: encryption.encrypt('fb_token'), phone_number_id: '1234' } }
    });
    
    await client.aIConfiguration.create({
      data: { tenantId: TENANT_ID, habilitada: true, apiKey: encryption.encrypt('fake-key'), defaultModel: 'test-model' }
    });

    await client.chatbotConfiguration.create({
      data: { tenantId: TENANT_ID, activo: true, modeloOpenRouter: 'test-model', personalidad: 'Amable', promptSistema: 'Eres un asistente', mensajeInicial: 'Hola', mensajeFueraHorario: 'Cerrado', permisos: {} }
    });
  });

  afterAll(async () => {
    const client = prisma.getTenantClient(TENANT_ID);
    await client.message.deleteMany({});
    await client.aIUsage.deleteMany({});
    await client.conversation.deleteMany({});
    await client.channelConnection.deleteMany({});
    await client.aIConfiguration.deleteMany({});
    await client.chatbotConfiguration.deleteMany({});
    await prisma.tenant.delete({ where: { id: TENANT_ID } });
    await app.close();
  });

  describe('Flujo 1 — Texto desde Facebook/Meta', () => {
    it('Debería procesar mensaje, invocar IA y guardar historial/costos', async () => {
      const client = prisma.getTenantClient(TENANT_ID);
      
      const payload = {
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'facebook_user_1' },
            message: { mid: 'mid_1', text: 'Hola, quiero info' }
          }]
        }]
      };

      await webhookService.processIncomingEvent(TENANT_ID, payload);

      // Verificar conversacion
      const conv = await client.conversation.findFirst({ where: { contactoId: 'facebook_user_1' } });
      expect(conv).toBeDefined();
      expect(conv?.estado).toBe('NO_LEIDA');

      // Verificar mensajes (Entrante y Saliente)
      const msgs = await client.message.findMany({ where: { conversationId: conv?.id } });
      expect(msgs.length).toBe(2);
      expect(msgs[0].content).toBe('Hola, quiero info');
      expect(msgs[0].direction).toBe('ENTRANTE');
      expect(msgs[1].content).toBe('Respuesta simulada de IA');
      expect(msgs[1].direction).toBe('SALIENTE');

      // Verificar AI Usage
      const usage = await client.aIUsage.findFirst({ where: { conversationId: conv?.id } });
      expect(usage).toBeDefined();
      expect(usage?.promptTokens).toBe(50);
      expect(usage?.completionTokens).toBe(20);
      expect(usage?.agente).toBe('chatbot_externo');
    });
  });

  describe('Flujo 2 — Audio desde Facebook/Meta', () => {
    it('Debería procesar audio, transcribir y responder', async () => {
      const client = prisma.getTenantClient(TENANT_ID);
      const audioTranscriptionService = app.get<AudioTranscriptionService>(AudioTranscriptionService);
      
      // Mock de transcripción para no requerir API real
      vi.spyOn(audioTranscriptionService, 'processTranscription').mockImplementation(async (t, cid, mid, url) => {
        try {
          await client.message.update({ where: { id: mid }, data: { transcription: 'Transcripción mockeada', transcripcionEstado: 'COMPLETADA' } });
          const res = await webhookService['aiChat'].getChatResponse(t, 'Transcripción mockeada', cid, { userId: 'facebook_user_2' });
          await client.message.create({
            data: {
              tenantId: t,
              conversationId: cid,
              senderType: 'BOT',
              direction: 'SALIENTE',
              messageType: 'TEXTO',
              content: res.reply,
              status: 'PENDIENTE',
              leido: true
            }
          });
        } catch (e) {
          console.error("Mock error:", e);
        }
      });

      const payload = {
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'facebook_user_2' },
            message: { mid: 'mid_2', attachments: [{ type: 'audio', payload: { url: 'https://example.com/audio.mp3' } }] }
          }]
        }]
      };

      await webhookService.processIncomingEvent(TENANT_ID, payload);
      await new Promise(r => setTimeout(r, 1000)); // Wait for background mock to finish

      const conv = await client.conversation.findFirst({ where: { contactoId: 'facebook_user_2' } });
      expect(conv).toBeDefined();

      const msgs = await client.message.findMany({ where: { conversationId: conv?.id }, orderBy: { createdAt: 'asc' } });
      expect(msgs.length).toBe(2);
      
      // Mensaje original (Audio + Transcripción)
      expect(msgs[0].messageType).toBe('AUDIO');
      expect(msgs[0].mediaUrl).toContain('.mp3');
      expect(msgs[0].transcription).toBe('Transcripción mockeada');

      // Respuesta de la IA
      expect(msgs[1].content).toBe('Respuesta simulada de IA');
    });
  });
});
