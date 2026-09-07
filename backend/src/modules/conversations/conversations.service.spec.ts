import { AudioTranscriptionService } from './audio-transcription.service.js';
import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue({
      conversation: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      conversationMessage: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      }
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AudioTranscriptionService, useValue: {} },
        ConversationsService,
        { provide: PrismaService, useValue: mockPrismaService }
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list conversations', async () => {
    const res = await service.findAll('tenant-1', 'user-1', 'Admin', {});
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });

  describe('createLeadFromConversation', () => {
    it('debería crear un lead con datos personalizados y asociarlo a la conversación', async () => {
      const mockConv = {
        id: 'conv-123',
        tenantId: 'tenant-1',
        canal: 'WHATSAPP',
        contactoId: '+59178912345',
        nombreContacto: 'Juan WhatsApp',
        ultimoMensaje: 'Hola, quiero comprar paneles solares',
      };

      const tenantClient = {
        conversation: {
          findUnique: vi.fn().mockResolvedValue(mockConv),
          update: vi.fn().mockResolvedValue({ ...mockConv, leadId: 'lead-new' }),
        },
        lead: {
          count: vi.fn().mockResolvedValue(2),
          create: vi.fn().mockResolvedValue({
            id: 'lead-new',
            leadId: 'LEAD-003',
            name: 'Juan Perez',
            phone: '+59178912345',
            empresa: 'Solar Energy',
          }),
        },
        leadTouchpoint: {
          create: vi.fn().mockResolvedValue({ id: 'tp-1' }),
        },
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClient);

      const customData = {
        nombre: 'Juan Perez',
        empresa: 'Solar Energy',
        productoInteres: 'Paneles',
      };

      const result = await service.createLeadFromConversation('tenant-1', 'conv-123', customData, 'user-1');

      expect(tenantClient.lead.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: 'Juan Perez',
          companyName: 'Solar Energy',
          phone: '+59178912345',
          productoInteres: 'Paneles',
          fuente: 'WHATSAPP_ZERNIO',
        }),
      }));
      expect(tenantClient.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        data: { leadId: 'lead-new' },
      });
      expect(result.id).toBe('lead-new');
    });
  });
});
