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
      const plain = this.encryption.decrypt(encrypted);
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
      mensajeInicial: '¡Hola! ¿En qué puedo ayudarte?',
      horarioAtencion: null,
      mensajeFueraHorario: 'En este momento no estamos disponibles. Deja tu mensaje y te responderemos pronto.',
      reglasComerciales: '',
      informacionInstitucional: '',
      instruccionesProhibidas: '',
      nivelCreatividad: 0.3,
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

  async updateConfig(tenantId: string, userId: string, dto: ChatbotConfigDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const currentConfig = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    const currentPermisos = (currentConfig?.permisos as any) || {};
    const permisos = dto.permisos ? { ...currentPermisos, ...dto.permisos } : currentPermisos;
    const trimmedModel = dto.modeloOpenRouter?.trim() || currentConfig?.modeloOpenRouter || 'openai/gpt-4o-mini';
    const data: any = {
      nombre: dto.nombre ?? currentConfig?.nombre ?? 'Asistente',
      activo: dto.activo ?? currentConfig?.activo ?? false,
      promptSistema: dto.promptSistema ?? currentConfig?.promptSistema ?? '',
      personalidad: dto.personalidad ?? currentConfig?.personalidad ?? '',
      tono: dto.tono ?? currentConfig?.tono ?? 'profesional',
      idioma: dto.idioma ?? currentConfig?.idioma ?? 'es',
      mensajeInicial: dto.mensajeInicial ?? currentConfig?.mensajeInicial ?? '¡Hola! ¿En qué puedo ayudarte?',
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

    if (dto.apiKey && dto.apiKey.trim() && !dto.apiKey.trim().startsWith('****')) {
      data.apiKey = this.encryption.encrypt(dto.apiKey.trim());
    }

    const config = await tenantClient.chatbotConfiguration.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'UPDATE_CHATBOT_CONFIG',
        details: { fields: Object.keys(dto).filter((key) => key !== 'apiKey') },
      },
    });

    return this.withPublicApiKey(config);
  }

  async activate(tenantId: string, userId: string, activo: boolean) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.update({
      where: { tenantId },
      data: { activo },
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'ACTIVATE_CHATBOT',
        details: { activo },
      },
    });

    return this.withPublicApiKey(config);
  }

  async reset(tenantId: string, userId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await tenantClient.chatbotConfiguration.deleteMany({ where: { tenantId } });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'RESET_CHATBOT_CONFIG',
        details: {},
      },
    });

    return this.getConfig(tenantId);
  }

  async testConnection(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    const aiConfig = await tenantClient.aIConfiguration.findUnique({ where: { tenantId } });
    const encryptedKey = config?.apiKey || aiConfig?.apiKey;

    if (!encryptedKey) {
      throw new BadRequestException('No hay una API Key de OpenRouter configurada para el chatbot.');
    }

    let apiKey = '';
    try {
      apiKey = this.encryption.decrypt(encryptedKey);
    } catch {
      throw new InternalServerErrorException('No se pudo descifrar la API Key del chatbot.');
    }

    const model = this.normalizeModel(config?.modeloOpenRouter || aiConfig?.defaultModel || 'openai/gpt-4o-mini');
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
      throw new BadRequestException(`OpenRouter rechazó la configuración del chatbot (${response.status}). ${error}`.trim());
    }

    return { success: true, message: 'Conexión exitosa del chatbot con OpenRouter.', model };
  }

  async testChatbot(tenantId: string, userId: string, mensaje: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfiguration.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('Configuración de chatbot no encontrada');

    const conv = await this.aiChat.createConversation(tenantId, userId, 'Prueba de Chatbot');
    return this.aiChat.getChatResponse(tenantId, mensaje || 'Hola', conv.id, {
      userId,
      roleName: 'Admin',
      userName: 'Usuario de prueba',
      ignoreActive: true,
    } as any);
  }

  private normalizeModel(model: string) {
    return model === 'free-models-router' ? 'openrouter/auto' : model;
  }
}