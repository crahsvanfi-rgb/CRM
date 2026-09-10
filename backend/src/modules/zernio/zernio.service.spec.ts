import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ZernioService } from './zernio.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { AiChatService } from '../ai-chat/ai-chat.service.js';
import { ExternalChannel, ActivityType } from '@prisma/client';

describe('ZernioService', () => {
  let service: ZernioService;
  let prisma: any;
  let encryption: any;
  let aiChat: any;
  let mockTenantClient: any;

  const mockTenantId = 'tenant-123-uuid';

  beforeEach(async () => {
    mockTenantClient = {
      channelConnection: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      customer: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      lead: {
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      leadTouchpoint: {
        create: vi.fn().mockResolvedValue({ id: 'tp-1' }),
      },
      conversation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      message: {
        create: vi.fn(),
        update: vi.fn(),
      },
      activity: {
        create: vi.fn(),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'user-sales-1' }),
      },
    };

    prisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ id: mockTenantId }),
        findFirst: vi.fn().mockResolvedValue({ id: mockTenantId }),
      },
      getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
    };

    encryption = {
      encrypt: vi.fn().mockImplementation((val: string) => `enc_${val}`),
      decrypt: vi.fn().mockImplementation((val: string) => val.replace('enc_', '')),
      tryDecrypt: vi.fn().mockImplementation((val: string) => val.startsWith('enc_') ? val.replace('enc_', '') : null),
    };

    aiChat = {
      getChatResponse: vi.fn().mockResolvedValue({
        reply: 'Hola, tenemos los mejores productos disponibles.',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZernioService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: AiChatService, useValue: aiChat },
      ],
    }).compile();

    service = module.get<ZernioService>(ZernioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return SIN_CONFIGURAR if no configuration exists', async () => {
      mockTenantClient.channelConnection.findFirst.mockResolvedValue(null);
      const res = await service.getConfig(mockTenantId);
      expect(res.status).toBe('SIN_CONFIGURAR');
      expect(res.habilitado).toBe(false);
    });

    it('should return masked apiKey if configured', async () => {
      mockTenantClient.channelConnection.findFirst.mockResolvedValue({
        id: 'conn-1',
        habilitado: true,
        configJson: { token: 'enc_secret123' },
      });

      const res = await service.getConfig(mockTenantId);
      expect(res.status).toBe('CONECTADO');
      expect(res.apiKey).toBe('********');
    });
  });

  describe('updateConfig', () => {
    it('should encrypt apiKey and upsert ChannelConnection with ZERNIO', async () => {
      mockTenantClient.channelConnection.findFirst.mockResolvedValue(null);
      mockTenantClient.channelConnection.upsert.mockResolvedValue({
        id: 'conn-1',
        habilitado: true,
      });

      const res = await service.updateConfig(mockTenantId, {
        apiKey: 'secret_zernio_key',
        habilitado: true,
      });

      expect(encryption.encrypt).toHaveBeenCalledWith('secret_zernio_key');
      expect(mockTenantClient.channelConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_canal: {
              tenantId: mockTenantId,
              canal: ExternalChannel.ZERNIO,
            },
          },
        }),
      );
      expect(res.success).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('should create conversation and outgoing message', async () => {
      mockTenantClient.channelConnection.findFirst.mockResolvedValue({
        configJson: { token: 'enc_token' },
      });
      mockTenantClient.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
      });
      mockTenantClient.message.create.mockResolvedValue({
        id: 'msg-1',
      });
      mockTenantClient.message.update.mockResolvedValue({
        id: 'msg-1',
        status: 'ENVIADO',
      });

      const res = await service.sendMessage(mockTenantId, {
        telefono: '+59171234567',
        mensaje: 'Hola desde CRM',
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe('msg-1');
      expect(mockTenantClient.message.create).toHaveBeenCalled();
    });
  });

  describe('publishContent', () => {
    it('should publish content and return published status', async () => {
      mockTenantClient.channelConnection.findFirst.mockResolvedValue({
        configJson: { token: 'enc_token' },
      });

      const res = await service.publishContent(mockTenantId, {
        plataformas: ['whatsapp', 'facebook'],
        texto: 'Promoción especial de verano',
      });

      expect(res.success).toBe(true);
      expect(res.published).toBe(true);
      expect(res.plataformas).toEqual(['whatsapp', 'facebook']);
    });
  });

  describe('verifyWebhook', () => {
    it('should return challenge on valid token', async () => {
      mockTenantClient.channelConnection.findFirst.mockResolvedValue({
        configJson: { verify_token: 'enc_custom_token' },
      });

      const result = await service.verifyWebhook('subscribe', 'custom_token', 'challenge_abc', mockTenantId);
      expect(result).toBe('challenge_abc');
    });
  });

  describe('handleIncomingWebhook', () => {
    it('should create new lead if contact does not exist', async () => {
      mockTenantClient.customer.findFirst.mockResolvedValue(null);
      mockTenantClient.lead.findFirst.mockResolvedValue(null);
      mockTenantClient.lead.create.mockResolvedValue({
        id: 'new-lead-1',
        name: 'Lead WhatsApp (+59170000000)',
      });
      mockTenantClient.conversation.findFirst.mockResolvedValue({ id: 'conv-1', modo: 'HUMANO' });
      mockTenantClient.message.create.mockResolvedValue({ id: 'msg-in-1' });

      const res = await service.handleIncomingWebhook(mockTenantId, {
        telefono: '+59170000000',
        mensaje: 'Hola, información por favor',
      });

      expect(res.success).toBe(true);
      expect(res.leadCreated).toBe(true);
      expect(mockTenantClient.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fuente: 'WHATSAPP_ZERNIO',
            phone: '+59170000000',
          }),
        }),
      );
    });

    it('should automatically schedule an Activity when schedule intent is detected', async () => {
      mockTenantClient.customer.findFirst.mockResolvedValue(null);
      mockTenantClient.lead.findFirst.mockResolvedValue({ id: 'existing-lead', name: 'Juan' });
      mockTenantClient.conversation.findFirst.mockResolvedValue({ id: 'conv-1', modo: 'HUMANO' });
      mockTenantClient.message.create.mockResolvedValue({ id: 'msg-in-2' });
      mockTenantClient.activity.create.mockResolvedValue({ id: 'act-reunion-1' });

      const res = await service.handleIncomingWebhook(mockTenantId, {
        telefono: '+59170000000',
        mensaje: 'Quisiera agendar una reunión para mañana a ver los precios',
      });

      expect(res.success).toBe(true);
      expect(res.activityScheduled).toBe(true);
      expect(mockTenantClient.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: ActivityType.REUNION,
            titulo: 'Reunión solicitada por WhatsApp',
          }),
        }),
      );
    });

    it('should invoke AI agent and send automated response for commercial queries', async () => {
      mockTenantClient.customer.findFirst.mockResolvedValue(null);
      mockTenantClient.lead.findFirst.mockResolvedValue({ id: 'lead-1', name: 'Ana' });
      mockTenantClient.conversation.findFirst.mockResolvedValue({ id: 'conv-1', modo: 'IA', nombreContacto: 'Ana' });
      mockTenantClient.message.create.mockResolvedValue({ id: 'msg-in-3' });
      mockTenantClient.channelConnection.findFirst.mockResolvedValue({
        configJson: { token: 'enc_token' },
      });

      const res = await service.handleIncomingWebhook(mockTenantId, {
        telefono: '+59170000000',
        mensaje: '¿Qué precio tienen los paneles solares?',
      });

      expect(res.success).toBe(true);
      expect(aiChat.getChatResponse).toHaveBeenCalled();
      expect(res.replySent).toBe(true);
    });
  });
});
