import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SenderType, ConversationStatus, MessageDirection, MessageStatus, MessageContentType, ExternalChannel, ConversationMode, TranscriptionStatus } from '@prisma/client';
import { UpdateConversationStatusDto, SendMessageDto } from './dto/conversations.dto.js';
import { AudioTranscriptionService } from './audio-transcription.service.js';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private audioTranscription: AudioTranscriptionService
  ) {}

  async findAll(tenantId: string, userId: string, roleName: string, query: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { page = 1, limit = 20, estado, canal, search, noLeidas } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // RBAC: Si es Vendedor, solo ve las asignadas a él
    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      where.asesorId = userId;
    }

    if (estado) where.estado = estado;
    if (canal) where.canal = canal;
    if (noLeidas === 'true') where.messages = { some: { leido: false } };
    
    if (search) {
      where.OR = [
        { nombreContacto: { contains: search, mode: 'insensitive' } },
        { ultimoMensaje: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      tenantClient.conversation.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: { asesor: { select: { id: true, name: true } } }
      }),
      tenantClient.conversation.count({ where })
    ]);

    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, userId: string, roleName: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const conv = await tenantClient.conversation.findUnique({
      where: { id, tenantId },
      include: { 
        asesor: { select: { id: true, name: true } },
        cliente: { select: { id: true, nombreComercial: true } },
        lead: { select: { id: true, name: true } }
      }
    });

    if (!conv) throw new NotFoundException('Conversación no encontrada');
    if (roleName !== 'Admin' && roleName !== 'Gerente' && conv.asesorId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    return conv;
  }

  async findMessages(tenantId: string, id: string, query: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      tenantClient.message.findMany({
        where: { tenantId, conversationId: id },
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' } // Frontend los invertirá
      }),
      tenantClient.message.count({ where: { tenantId, conversationId: id } })
    ]);

    return { items: items.reverse(), total, page: Number(page), limit: Number(limit) };
  }

  async sendMessage(tenantId: string, userId: string, roleName: string, id: string, dto: SendMessageDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const conv = await this.findOne(tenantId, userId, roleName, id);

    if (conv.estado === ConversationStatus.CERRADA) {
      throw new BadRequestException('No puedes enviar mensajes a una conversación cerrada');
    }

    // Guardar mensaje
    const msg = await tenantClient.message.create({
      data: {
        tenantId,
        conversationId: id,
        senderType: SenderType.HUMANO,
        direction: MessageDirection.SALIENTE,
        messageType: dto.messageType || MessageContentType.TEXTO,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        status: MessageStatus.PENDIENTE,
        leido: true
      }
    });

    // Actualizar conv
    const textoUltimo = dto.messageType && dto.messageType !== 'TEXTO' ? `[${dto.messageType}]` : dto.content;
    await tenantClient.conversation.update({
      where: { id },
      data: {
        ultimoMensaje: textoUltimo,
        fechaUltimoMensaje: new Date(),
        estado: ConversationStatus.ABIERTA // Si estaba NO_LEIDA pasa a ABIERTA
      }
    });

    // Idealmente aquí se llamaría a Zenior/WhatsApp API para enviarlo físicamente al canal
    // Por ser MVP simulamos éxito:
    await tenantClient.message.update({
      where: { id: msg.id },
      data: { status: MessageStatus.ENVIADO }
    });

    return msg;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateConversationStatusDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.conversation.update({
      where: { id, tenantId },
      data: { estado: dto.estado }
    });
  }

  async getMode(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const conv = await tenantClient.conversation.findUnique({ where: { id, tenantId }, select: { modo: true } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    return { modo: conv.modo };
  }

  async takeControl(tenantId: string, userId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const conv = await tenantClient.conversation.findUnique({ where: { id, tenantId } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    
    if (conv.modo === ConversationMode.HUMANO) {
      throw new BadRequestException('La conversación ya está en modo HUMANO');
    }

    return tenantClient.conversation.update({
      where: { id, tenantId },
      data: { 
        asesorId: conv.asesorId || userId,
        modo: ConversationMode.HUMANO,
        estado: ConversationStatus.ABIERTA,
        tomadoPorId: userId,
        fechaToma: new Date()
      }
    });
  }

  async returnToBot(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const conv = await tenantClient.conversation.findUnique({ where: { id, tenantId } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');

    if (conv.modo === ConversationMode.IA) {
      throw new BadRequestException('La conversación ya está en modo IA');
    }

    return tenantClient.conversation.update({
      where: { id, tenantId },
      data: { 
        modo: ConversationMode.IA,
        estado: ConversationStatus.PENDIENTE,
        fechaDevolucion: new Date()
      }
    });
  }

  async closeConversation(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.conversation.update({
      where: { id, tenantId },
      data: { estado: ConversationStatus.CERRADA }
    });
  }

  async markAsRead(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await tenantClient.message.updateMany({
      where: { tenantId, conversationId: id, leido: false },
      data: { leido: true }
    });
    
    // Si la conversación era NO_LEIDA, la pasa a PENDIENTE (o ABIERTA)
    const conv = await tenantClient.conversation.findUnique({ where: { id }});
    if (conv?.estado === ConversationStatus.NO_LEIDA) {
      await tenantClient.conversation.update({
        where: { id },
        data: { estado: ConversationStatus.PENDIENTE }
      });
    }

    return { success: true };
  }

  async createLeadFromConversation(tenantId: string, id: string, customData?: any, userId?: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const conv = await tenantClient.conversation.findUnique({ where: { id, tenantId } });

    if (!conv) throw new NotFoundException('Conversación no encontrada');
    if (conv.leadId || conv.clienteId) throw new BadRequestException('La conversación ya está asociada a un Lead o Cliente');

    const name = (customData?.name || customData?.nombre || conv.nombreContacto || 'Contacto WhatsApp').trim();
    const companyName = customData?.companyName || customData?.empresa || null;
    const phone = customData?.phone || customData?.telefono || (conv.canal === ExternalChannel.WHATSAPP ? conv.contactoId : null);
    const email = customData?.email || null;
    const ciudad = customData?.ciudad || customData?.city || null;
    const productoInteres = customData?.productoInteres || null;
    const observaciones = customData?.observaciones || (conv.ultimoMensaje ? `Mensaje inicial: ${conv.ultimoMensaje}` : null);
    const estado = customData?.estado || 'NUEVO';
    const fuente = customData?.fuente || (conv.canal === ExternalChannel.WHATSAPP ? 'WHATSAPP_ZERNIO' : conv.canal);
    let vendedorId: string | null = null;
    const candidateId = customData?.vendedorId || (userId && userId !== '00000000-0000-0000-0000-000000000000' ? userId : null);
    if (candidateId) {
      try {
        const u = await this.prisma.user.findUnique({ where: { id: candidateId } });
        if (u && u.tenantId === tenantId) {
          vendedorId = u.id;
        }
      } catch {
        // Ignorar si no es UUID válido
      }
    }

    const count = await tenantClient.lead.count();
    const leadCode = `LEAD-${(count + 1).toString().padStart(3, '0')}`;

    const lead = await tenantClient.lead.create({
      data: {
        tenantId,
        leadId: leadCode,
        name,
        companyName,
        phone,
        email,
        ciudad,
        productoInteres,
        observaciones,
        estado,
        fuente,
        vendedorId,
      },
    });

    await tenantClient.conversation.update({
      where: { id },
      data: { leadId: lead.id },
    });

    try {
      await tenantClient.leadTouchpoint.create({
        data: {
          tenantId,
          leadId: lead.id,
          canal: conv.canal === ExternalChannel.WHATSAPP ? 'WHATSAPP' : 'OTRO',
          fecha: new Date(),
          participanteInterno: 'Vendedor',
          participanteExterno: name,
          resumen: conv.ultimoMensaje ? `Conversación vinculada: ${conv.ultimoMensaje}` : 'Lead creado desde conversación',
          puntosInteres: productoInteres,
          etapa: 'CONTACTO_INICIAL',
        },
      });
    } catch {
      // no-op
    }

    return lead;
  }

  async uploadAttachment(tenantId: string, id: string, file: any) {
    // Para MVP, simulamos el upload retornando un URL.
    // En producción se usaría el SDK de Supabase Storage.
    const simulatedUrl = `https://supabase.example.com/storage/v1/object/public/tenant-${tenantId}/chats/${id}/${file.originalname}`;
    
    let tipoContenido: MessageContentType = MessageContentType.DOCUMENTO;
    if (file.mimetype.startsWith('image/')) tipoContenido = MessageContentType.IMAGEN;
    if (file.mimetype.startsWith('audio/')) tipoContenido = MessageContentType.AUDIO;
    if (file.mimetype.startsWith('video/')) tipoContenido = MessageContentType.VIDEO;

    return { url: simulatedUrl, tipoContenido };
  }

  async uploadAudio(tenantId: string, userId: string, roleName: string, id: string, file: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    // Simulate Supabase Storage upload
    const simulatedUrl = `https://supabase.example.com/storage/v1/object/public/tenant-${tenantId}/audios/${id}/${Date.now()}_${file.originalname}`;
    
    // Create the message
    const msg = await tenantClient.message.create({
      data: {
        tenantId,
        conversationId: id,
        senderType: SenderType.HUMANO, // Defaulting to humano si se sube desde el dashboard
        direction: MessageDirection.SALIENTE,
        messageType: MessageContentType.AUDIO,
        mediaUrl: simulatedUrl,
        status: MessageStatus.ENVIADO,
        leido: true,
        transcripcionEstado: TranscriptionStatus.PENDIENTE
      }
    });

    // Start background transcription
    this.audioTranscription.processTranscription(tenantId, id, msg.id, simulatedUrl);

    return msg;
  }

  async getTranscription(tenantId: string, conversationId: string, messageId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const msg = await tenantClient.message.findUnique({
      where: { id: messageId, tenantId, conversationId }
    });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    return {
      transcripcion: msg.transcription,
      transcripcionEstado: msg.transcripcionEstado,
      duracionSegundos: msg.duracionSegundos
    };
  }

  async retryTranscription(tenantId: string, userId: string, roleName: string, conversationId: string, messageId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const msg = await tenantClient.message.findUnique({
      where: { id: messageId, tenantId, conversationId }
    });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    
    if (msg.transcripcionEstado !== TranscriptionStatus.ERROR) {
      throw new BadRequestException('La transcripción no está en estado ERROR');
    }

    await tenantClient.message.update({
      where: { id: messageId },
      data: { transcripcionEstado: TranscriptionStatus.PENDIENTE }
    });

    this.audioTranscription.processTranscription(tenantId, conversationId, messageId, msg.mediaUrl);

    return { success: true };
  }
}
