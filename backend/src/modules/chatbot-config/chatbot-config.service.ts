import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChatbotConfigDto } from './dto/chatbot-config.dto.js';
import { Prisma } from '@prisma/client';
import { AiChatService } from '../ai-chat/ai-chat.service.js';

@Injectable()
export class ChatbotConfigService {
  constructor(
    private prisma: PrismaService,
    private aiChat: AiChatService
  ) {}

  async getConfig(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    let config = await tenantClient.chatbotConfig.findUnique({
      where: { tenantId }
    });

    if (!config) {
      config = {
        id: 'default',
        tenantId,
        nombre: 'Asistente',
        activo: false,
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
        nivelCreatividad: new Prisma.Decimal(0.3),
        modeloOpenRouter: 'openai/gpt-4o-mini',
        permisos: {
          consultarProductos: false,
          consultarStock: false,
          consultarPrecios: false,
          consultarPedidos: false,
          capturarLeads: false,
          generarActividades: false
        },
        transferirHumano: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
    }
    return config;
  }

  async updateConfig(tenantId: string, userId: string, dto: ChatbotConfigDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    // Normalize permisos with defaults if missing
    const currentConfig = await tenantClient.chatbotConfig.findUnique({ where: { tenantId } });
    const currentPermisos = currentConfig?.permisos as any || {};
    
    const newPermisos = dto.permisos ? {
      ...currentPermisos,
      ...dto.permisos
    } : currentPermisos;

    const data: any = {
      ...dto,
      permisos: newPermisos
    };

    const config = await tenantClient.chatbotConfig.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        nombre: dto.nombre || 'Asistente',
        activo: dto.activo || false,
        promptSistema: dto.promptSistema || '',
        personalidad: dto.personalidad || '',
        tono: dto.tono || 'profesional',
        idioma: dto.idioma || 'es',
        mensajeInicial: dto.mensajeInicial || '¡Hola! ¿En qué puedo ayudarte?',
        horarioAtencion: dto.horarioAtencion as any || null,
        mensajeFueraHorario: dto.mensajeFueraHorario || 'En este momento no estamos disponibles.',
        reglasComerciales: dto.reglasComerciales || '',
        informacionInstitucional: dto.informacionInstitucional || '',
        instruccionesProhibidas: dto.instruccionesProhibidas || '',
        nivelCreatividad: dto.nivelCreatividad ?? 0.3,
        modeloOpenRouter: dto.modeloOpenRouter || 'openai/gpt-4o-mini',
        permisos: newPermisos,
        transferirHumano: dto.transferirHumano || false
      }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'UPDATE_CHATBOT_CONFIG',
        details: { fields: Object.keys(dto) }
      }
    });

    return config;
  }

  async activate(tenantId: string, userId: string, activo: boolean) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfig.update({
      where: { tenantId },
      data: { activo }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'ACTIVATE_CHATBOT',
        details: { activo }
      }
    });

    return config;
  }

  async reset(tenantId: string, userId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await tenantClient.chatbotConfig.deleteMany({
      where: { tenantId }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'RESET_CHATBOT_CONFIG',
        details: {}
      }
    });
    return this.getConfig(tenantId);
  }

  async testChatbot(tenantId: string, userId: string, mensaje: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.chatbotConfig.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('Configuración no encontrada');

    // Create a temporary conversation for test
    const conv = await this.aiChat.createConversation(tenantId, userId, 'Prueba de Chatbot');
    
    // Test ignores schedule
    const res = await this.aiChat.sendMessage(tenantId, userId, conv.id, mensaje);
    
    // Optionally delete the test conversation so it doesn't clutter history, or leave it.
    // await this.aiChat.deleteConversation(tenantId, conv.id);
    
    return res;
  }
}
