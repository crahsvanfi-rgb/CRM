import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { ChatbotConfigDto } from './dto/chatbot-config.dto.js';
import { AiChatService } from '../ai-chat/ai-chat.service.js';

@Injectable()
export class ChatbotConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly aiChat: AiChatService,
  ) {}

  private maskApiKey(encrypted?: string | null) {
    if (!encrypted) return null;
    try {
      const plain = this.encryption.tryDecrypt(encrypted, 'API Key de OpenRouter del chatbot');
      return plain ? `****${plain.slice(-4)}` : null;
    } catch {
      return '****ERROR';
    }
  }

  private withPublicApiKey(config: any) {
    if (!config) return config;
    return {
      ...config,
      apiKey: this.maskApiKey(config.apiKey),
      estado: config.apiKey ? 'CONECTADO' : 'SIN_CONFIGURAR',
      nivelCreatividad: config.nivelCreatividad ? Number(config.nivelCreatividad) : 0.3,
      maxTokens: config.maxTokens || 1000,
      modelo: config.modeloOpenRouter || 'openai/gpt-4o-mini',
    };
  }

  private defaultConfig(tenantId: string) {
    return {
      id: 'default',
      tenantId,
      nombre: 'Asistente',
      activo: false,
      apiKey: null,
      promptSistema: '',
      personalidad: '',
      tono: 'profesional',
      idioma: 'es',
      mensajeInicial: 'Â¡Hola! Â¿En quÃ© puedo ayudarte?',
      horarioAtencion: null,
      mensajeFueraHorario: 'En este momento no estamos disponibles. Deja tu mensaje y te responderemos pronto.',
      reglasComerciales: '',
      informacionInstitucional: '',
      instruccionesProhibidas: '',
      nivelCreatividad: 0.3,
      modeloOpenRouter: 'openai/gpt-4o-mini',
      modelo: 'openai/gpt-4o-mini',
      maxTokens: 1000,
      permisos: {
        consultarProductos: false,
        consultarStock: false,
        consultarPrecios: false,
        consultarPedidos: false,
        capturarLeads: false,
        generarActividades: false,
      },
      transferirHumano: false,
      estado: 'SIN_CONFIGURAR',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getConfig(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    return this.withPublicApiKey(config) || this.defaultConfig(tenantId);
  }

  async updateConfig(tenantId: string, userId: string | undefined, dto: ChatbotConfigDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const currentConfig = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    const currentPermisos = (currentConfig?.permisos as any) || {};
    const permisos = dto.permisos ? { ...currentPermisos, ...dto.permisos } : currentPermisos;
    const trimmedModel = dto.modeloOpenRouter?.trim() || dto.modelo?.trim() || currentConfig?.modeloOpenRouter || 'openai/gpt-4o-mini';
    const data: any = {
      nombre: dto.nombre ?? currentConfig?.nombre ?? 'Asistente',
      activo: dto.activo ?? currentConfig?.activo ?? false,
      promptSistema: dto.promptSistema ?? currentConfig?.promptSistema ?? '',
      personalidad: dto.personalidad ?? currentConfig?.personalidad ?? '',
      tono: dto.tono ?? currentConfig?.tono ?? 'profesional',
      idioma: dto.idioma ?? currentConfig?.idioma ?? 'es',
      mensajeInicial: dto.mensajeInicial ?? currentConfig?.mensajeInicial ?? 'Â¡Hola! Â¿En quÃ© puedo ayudarte?',
      horarioAtencion: dto.horarioAtencion !== undefined ? dto.horarioAtencion as any : currentConfig?.horarioAtencion ?? null,
      mensajeFueraHorario: dto.mensajeFueraHorario ?? currentConfig?.mensajeFueraHorario ?? 'En este momento no estamos disponibles.',
      reglasComerciales: dto.reglasComerciales ?? currentConfig?.reglasComerciales ?? '',
      informacionInstitucional: dto.informacionInstitucional ?? currentConfig?.informacionInstitucional ?? '',
      instruccionesProhibidas: dto.instruccionesProhibidas ?? currentConfig?.instruccionesProhibidas ?? '',
      nivelCreatividad: new Prisma.Decimal(dto.nivelCreatividad ?? Number(currentConfig?.nivelCreatividad ?? 0.3)),
      modeloOpenRouter: trimmedModel,
      maxTokens: dto.maxTokens ?? currentConfig?.maxTokens ?? 1000,
      permisos,
      transferirHumano: dto.transferirHumano ?? currentConfig?.transferirHumano ?? false,
    };

    if (dto.apiKey !== undefined) {
      const incomingApiKey = dto.apiKey.trim();
      if (!incomingApiKey) {
        data.apiKey = null;
      } else if (!incomingApiKey.startsWith('****')) {
        data.apiKey = this.encryption.encrypt(incomingApiKey);
      }
    }

    const config = await tenantClient.chatbotConfiguration.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });

    await this.writeAudit(tenantClient, tenantId, userId, 'UPDATE_CHATBOT_CONFIG', {
      fields: Object.keys(dto).filter((key) => key !== 'apiKey'),
    });

    return this.withPublicApiKey(config);
  }

  async activate(tenantId: string, userId: string | undefined, activo: boolean) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.upsert({
      where: { tenantId },
      update: { activo },
      create: {
        tenantId,
        nombre: 'Asistente',
        activo,
        promptSistema: '',
        personalidad: '',
        tono: 'profesional',
        idioma: 'es',
        mensajeInicial: 'Hola! En que puedo ayudarte?',
        horarioAtencion: null,
        mensajeFueraHorario: 'En este momento no estamos disponibles. Deja tu mensaje y te responderemos pronto.',
        reglasComerciales: '',
        informacionInstitucional: '',
        instruccionesProhibidas: '',
        nivelCreatividad: new Prisma.Decimal(0.3),
        modeloOpenRouter: 'openai/gpt-4o-mini',
        maxTokens: 1000,
        permisos: {
          consultarProductos: false,
          consultarStock: false,
          consultarPrecios: false,
          consultarPedidos: false,
          capturarLeads: false,
          generarActividades: false,
        },
        transferirHumano: false,
      },
    });

    await this.writeAudit(tenantClient, tenantId, userId, 'ACTIVATE_CHATBOT', { activo });

    return this.withPublicApiKey(config);
  }

  async reset(tenantId: string, userId: string | undefined) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await tenantClient.chatbotConfiguration.deleteMany({ where: { tenantId } });

    await this.writeAudit(tenantClient, tenantId, userId, 'RESET_CHATBOT_CONFIG', {});

    return this.getConfig(tenantId);
  }

  async testConnection(tenantId: string, dto?: ChatbotConfigDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    const aiConfig = await tenantClient.aIConfiguration.findUnique({ where: { tenantId } });
    const incomingKey = dto?.apiKey?.trim();
    const chatbotOverrideKey = config?.apiKey
      ? this.encryption.tryDecrypt(config.apiKey, 'API Key de OpenRouter del chatbot')
      : null;
    const inheritedAiKey = aiConfig?.apiKey
      ? this.encryption.tryDecrypt(aiConfig.apiKey, 'API Key de OpenRouter de IA')
      : null;
    const apiKey = incomingKey && !incomingKey.startsWith('****')
      ? incomingKey
      : chatbotOverrideKey || inheritedAiKey;

    if (!apiKey) {
      throw new BadRequestException('La API Key no pudo descifrarse. Vuelve a guardarla en Configuraci\u00f3n \u2192 IA');
    }

    const model = this.normalizeModel(this.resolveModel(dto, config, aiConfig));
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Responde solo: OK' }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new BadRequestException(`OpenRouter rechazÃ³ la configuraciÃ³n del chatbot (${response.status}). ${error}`.trim());
    }

    return { success: true, message: 'ConexiÃ³n exitosa del chatbot con OpenRouter.', model };
  }

  async testChatbot(tenantId: string, userId: string | undefined, mensaje: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('ConfiguraciÃ³n de chatbot no encontrada');

    const conv = await this.aiChat.createConversation(tenantId, userId, 'Prueba de Chatbot');
    return this.aiChat.getChatResponse(tenantId, mensaje || 'Hola', conv.id, {
      userId,
      roleName: 'Admin',
      userName: 'Usuario de prueba',
      ignoreActive: true,
    } as any);
  }

  private isUuid(value?: string | null) {
    return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
  }

  private async writeAudit(tenantClient: any, tenantId: string, userId: string | undefined, action: string, details: any) {
    if (!this.isUuid(userId)) return;

    const user = await tenantClient.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!user) return;

    try {
      await tenantClient.auditLog.create({
        data: { tenantId, userId, action, details },
      });
    } catch (error) {
      console.warn(`No se pudo registrar auditoria de chatbot (${action})`, error);
    }
  }

  private resolveModel(dto: ChatbotConfigDto | undefined, config: any, aiConfig: any) {
    const incomingModel = dto?.modeloOpenRouter?.trim() || dto?.modelo?.trim();
    if (incomingModel) return incomingModel;
    const chatbotModel = config?.modeloOpenRouter?.trim();
    if (chatbotModel && chatbotModel !== 'openai/gpt-4o-mini') return chatbotModel;
    return aiConfig?.defaultModel || chatbotModel || 'openai/gpt-4o-mini';
  }

  private normalizeModel(model: string) {
    return model === 'free-models-router' ? 'openrouter/auto' : model;
  }
}





