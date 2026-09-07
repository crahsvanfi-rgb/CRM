import { AudioTranscriptionService } from '../conversations/audio-transcription.service.js';
import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ZeniorWebhookService } from './zenior-webhook.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { AiChatService } from '../ai-chat/ai-chat.service.js';
import { ExternalChannel, MessageDirection, MessageStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

describe('ZeniorWebhookService', () => {
  let service: ZeniorWebhookService;
  let aiChatService: AiChatService;

  const mockTenantClient = {
    channelConnection: {
      findFirst: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'conv-1', nombreContacto: 'Nuevo Cliente' }),
      update: vi.fn(),
    },
    message: {
      create: vi.fn().mockResolvedValue({ id: 'msg-out-1' }),
      update: vi.fn(),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    lead: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'lead-1', name: 'Contacto WhatsApp' }),
    },
    leadTouchpoint: {
      create: vi.fn().mockResolvedValue({ id: 'tp-1' }),
    },
    campaignRecipient: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
  };

  const mockEncryptionService = {
    encrypt: vi.fn().mockReturnValue('encrypted'),
    decrypt: vi.fn().mockReturnValue('decrypted'),
  };

  const mockAiChatService = {
    getChatResponse: vi.fn().mockResolvedValue({ reply: 'Respuesta simulada del bot' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AudioTranscriptionService, useValue: {} },
        ZeniorWebhookService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<ZeniorWebhookService>(ZeniorWebhookService);
    aiChatService = module.get<AiChatService>(AiChatService);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    
    vi.clearAllMocks();
  });

  it('should verify webhook token successfully', async () => {
    mockTenantClient.channelConnection.findFirst.mockResolvedValueOnce({
      configJson: { verify_token: 'encrypted_secret' },
    });
    mockEncryptionService.decrypt.mockReturnValueOnce('secret123');

    const result = await service.verifyWebhookToken('tenant-1', 'secret123');
    expect(result).toBe(true);
    expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted_secret');
  });

  it('should process incoming message, invoke AI and save messages', async () => {
    // 1. Configuración habilitada
    mockTenantClient.channelConnection.findFirst.mockResolvedValue({
      habilitado: true,
      configJson: { token: 'enc_token', phone_number_id: '12345' },
    });

    // 2. Conversación nueva (findFirst devuelve null, luego se crea)
    mockTenantClient.conversation.findFirst.mockResolvedValue(null);

    const webhookPayload = {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'user-1' },
          message: { text: 'Hola, quiero info', mid: 'mid-1' }
        }]
      }]
    };

    await service.processIncomingEvent('tenant-1', webhookPayload);

    // Verificar que se creó la conversación
    expect(mockTenantClient.conversation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ contactoId: 'user-1', ultimoMensaje: 'Hola, quiero info' })
    }));

    // Verificar que se guardó el mensaje entrante
    expect(mockTenantClient.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        direction: MessageDirection.ENTRANTE,
        content: 'Hola, quiero info'
      })
    }));

    // El mock responderá de inmediato
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verificar que se guardó el mensaje saliente y luego se actualizó a enviado
    expect(mockTenantClient.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ direction: MessageDirection.SALIENTE, content: 'Respuesta simulada del bot' })
    }));
    expect(mockTenantClient.message.update).toHaveBeenCalled();
  });

  it('should automatically create Lead with WHATSAPP_ZERNIO and INTERESADO status when commercial intent detected', async () => {
    mockTenantClient.channelConnection.findFirst.mockResolvedValue({
      habilitado: true,
      configJson: { token: 'enc_token', phone_number_id: '12345' },
    });
    mockTenantClient.customer.findMany.mockResolvedValue([]);
    mockTenantClient.lead.findMany.mockResolvedValue([]);
    mockTenantClient.conversation.findFirst.mockResolvedValue(null);

    const zernioPayload = {
      phone: '+59178945612',
      message: 'Buenas tardes, quisiera cotización y precio de inversores solares',
      contactName: 'Mario Vargas',
    };

    await service.processIncomingEvent('tenant-1', zernioPayload);

    expect(mockTenantClient.lead.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        phone: '+59178945612',
        name: 'Mario Vargas',
        fuente: 'WHATSAPP_ZERNIO',
        estado: 'INTERESADO',
        productoInteres: expect.stringMatching(/inversores/i),
      }),
    }));

    expect(mockTenantClient.leadTouchpoint.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        canal: 'WHATSAPP',
        etapa: 'CONTACTO_INICIAL',
        participanteExterno: 'Mario Vargas',
      }),
    }));

    expect(mockTenantClient.conversation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contactoId: '+59178945612',
        leadId: 'lead-1',
      }),
    }));
  });
});
