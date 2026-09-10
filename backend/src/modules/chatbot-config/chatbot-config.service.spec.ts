import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotConfigService } from './chatbot-config.service.js';

describe('ChatbotConfigService', () => {
  let service: ChatbotConfigService;
  let tenantClient: any;
  let encryption: any;

  beforeEach(() => {
    tenantClient = {
      chatbotConfiguration: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation(async (args: any) => ({
          id: 'cfg-1',
          ...(args.create || args.update),
          tenantId: args.where?.tenantId || args.create?.tenantId,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    const prisma = { getTenantClient: vi.fn().mockReturnValue(tenantClient) } as any;
    encryption = {
      encrypt: vi.fn((value: string) => `enc:${value}`),
      tryDecrypt: vi.fn((value: string) => value.replace('enc:', '')),
      decrypt: vi.fn((value: string) => value.replace('enc:', '')),
    };
    service = new ChatbotConfigService(prisma, encryption, {} as any);
  });

  it('encrypts optional chatbot API key override and accepts modelo alias', async () => {
    const result = await service.updateConfig('tenant-1', 'user-1', {
      nombre: 'Bot ventas',
      activo: true,
      apiKey: 'sk-or-test-chatbot',
      modelo: 'free-models-router',
      promptSistema: 'Eres un bot de ventas.',
      mensajeInicial: 'Hola',
      mensajeFueraHorario: 'Fuera de horario',
      permisos: { consultarProductos: true },
    });

    expect(encryption.encrypt).toHaveBeenCalledWith('sk-or-test-chatbot');
    expect(tenantClient.chatbotConfiguration.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        apiKey: 'enc:sk-or-test-chatbot',
        modeloOpenRouter: 'free-models-router',
      }),
    }));
    expect(result.apiKey).toBe('****tbot');
    expect(result.modelo).toBe('free-models-router');
  });

  it('creates default config when activating before saving settings', async () => {
    const result = await service.activate('tenant-1', 'user-1', true);

    expect(tenantClient.chatbotConfiguration.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1' },
      update: { activo: true },
      create: expect.objectContaining({
        tenantId: 'tenant-1',
        activo: true,
        modeloOpenRouter: 'openai/gpt-4o-mini',
        maxTokens: 1000,
      }),
    }));
    expect(result.activo).toBe(true);
  });

  it('clears chatbot API key override when apiKey is empty', async () => {
    await service.updateConfig('tenant-1', 'user-1', {
      apiKey: '',
      modelo: 'openai/gpt-4o-mini',
    });

    expect(tenantClient.chatbotConfiguration.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ apiKey: null }),
    }));
  });
});
