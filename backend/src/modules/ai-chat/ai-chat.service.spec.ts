import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiChatService } from './ai-chat.service.js';

const tenantId = 'tenant-1';
const conversationId = 'conv-1';

describe('AiChatService chatbot context', () => {
  let fetchMock: any;
  let requestBody: any;
  let service: AiChatService;
  let tenantClient: any;
  let encryption: any;

  beforeEach(() => {
    requestBody = null;
    fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      requestBody = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Recuerdo que preguntaste por paneles solares.' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    tenantClient = {
      aIConfiguration: {
        findUnique: vi.fn().mockResolvedValue({
          apiKey: 'enc_global_key',
          defaultModel: 'openai/gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 900,
        }),
      },
      chatbotConfiguration: {
        findUnique: vi.fn().mockResolvedValue({
          activo: true,
          apiKey: 'enc_chatbot_key',
          modeloOpenRouter: 'free-models-router',
          nivelCreatividad: 0.4,
          maxTokens: 500,
          promptSistema: 'Eres un bot comercial.',
          personalidad: 'memorable',
          reglasComerciales: 'No inventes precios.',
          informacionInstitucional: 'Importadora demo.',
          instruccionesProhibidas: 'No reveles secretos.',
          tono: 'profesional',
          idioma: 'es',
          permisos: {},
          horarioAtencion: null,
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: conversationId,
          tenantId,
          messages: [
            { senderType: 'CLIENTE', direction: 'ENTRANTE', content: 'De 450W' },
            { senderType: 'BOT', direction: 'SALIENTE', content: 'Claro, que potencia necesitas?' },
            { senderType: 'CLIENTE', direction: 'ENTRANTE', content: 'Hola, busco paneles solares' },
          ],
        }),
      },
    };

    const prisma = { getTenantClient: vi.fn().mockReturnValue(tenantClient) } as any;
    const aiToolsService = { getToolsDefinition: vi.fn().mockReturnValue([]), executeTool: vi.fn() } as any;
    const aiConfigService = {} as any;
    encryption = { tryDecrypt: vi.fn((value: string) => value === 'enc_chatbot_key' ? 'chatbot-secret' : 'global-secret') };
    const aiUsageService = { recordUsage: vi.fn().mockResolvedValue({}) } as any;

    service = new AiChatService(prisma, aiToolsService, aiConfigService, encryption, aiUsageService);
  });

  it('uses the chatbot API key override and model override when configured', async () => {
    await service.getChatResponse(tenantId, 'De 450W', conversationId, { userName: 'Ana', userId: 'whatsapp-1' });

    expect(encryption.tryDecrypt).toHaveBeenCalledWith('enc_chatbot_key', 'API Key de OpenRouter del chatbot');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer chatbot-secret');
    expect(requestBody.model).toBe('openrouter/auto');
    expect(requestBody.temperature).toBe(0.4);
    expect(requestBody.max_tokens).toBe(500);
  });

  it('sends recent conversation history to OpenRouter in role order', async () => {
    await service.getChatResponse(tenantId, 'De 450W', conversationId, { userName: 'Ana', userId: 'whatsapp-1' });

    expect(requestBody.messages.map((message: any) => message.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(requestBody.messages[1].content).toContain('paneles solares');
    expect(requestBody.messages[2].content).toBe('Claro, que potencia necesitas?');
    expect(requestBody.messages[3].content).toContain('De 450W');
  });
  it('falls back to the global AI API key when chatbot override cannot be decrypted', async () => {
    encryption.tryDecrypt.mockImplementation((value: string) => value === 'enc_chatbot_key' ? null : 'global-secret');

    await service.getChatResponse(tenantId, 'De 450W', conversationId, { userName: 'Ana', userId: 'whatsapp-1' });

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer global-secret');
  });
});

