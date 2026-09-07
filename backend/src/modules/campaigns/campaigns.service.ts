import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCampaignDto, UpdateCampaignDto, AddRecipientsDto, AddSegmentRecipientsDto, AutoRecoverInactiveDto, AutoProductDto, AutoVendorDto, ProcessResponseDto } from './dto/campaign.dto.js';
import { CampaignStatus, RecipientStatus, CampaignMessageStatus, CampaignType, CampaignTrigger, Priority } from '@prisma/client';
import { SegmentsService } from '../segments/segments.service.js';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentsService: SegmentsService
  ) {}

  private normalizeRole(role: any): string {
    if (!role) return 'user';
    if (typeof role === 'string') return role.toLowerCase();
    if (typeof role === 'object' && role.name) return String(role.name).toLowerCase();
    return 'user';
  }

  async create(tenantId: string, userId: string, userRole: string, createCampaignDto: CreateCampaignDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico solo tienen permisos de lectura');
    }
    
    // Si no es admin/gerente, solo puede asignarse a sí mismo
    if (role !== 'admin' && role !== 'gerente' && createCampaignDto.responsableId !== userId) {
      throw new ForbiddenException('No tienes permiso para crear campañas a nombre de otro responsable');
    }

    const campaign = await tenantClient.campaign.create({
      data: {
        tenantId,
        nombre: createCampaignDto.nombre,
        descripcion: createCampaignDto.descripcion,
        canal: createCampaignDto.canal,
        objetivo: createCampaignDto.objetivo,
        responsableId: createCampaignDto.responsableId,
        fechaProgramada: createCampaignDto.fechaProgramada ? new Date(createCampaignDto.fechaProgramada) : null,
      }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_CREATED',
        details: { campaignId: campaign.id, nombre: campaign.nombre, canal: campaign.canal, objetivo: campaign.objetivo }
      }
    }).catch(() => {});

    return campaign;
  }

  async findAll(tenantId: string, userId: string, userRole: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);
    
    const where: any = { tenantId };
    if (role === 'vendedor') {
      where.OR = [
        { responsableId: userId },
        { vendedorObjetivoId: userId }
      ];
    }

    return tenantClient.campaign.findMany({
      where,
      include: {
        _count: {
          select: { recipients: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await tenantClient.campaign.findUnique({
      where: { id, tenantId },
      include: {
        responsable: { select: { id: true, name: true } },
        _count: { select: { recipients: true } }
      }
    });

    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    const role = this.normalizeRole(userRole);
    if (role === 'vendedor' && campaign.responsableId !== userId && campaign.vendedorObjetivoId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta campaña');
    }

    return campaign;
  }

  async update(tenantId: string, userId: string, userRole: string, id: string, updateCampaignDto: UpdateCampaignDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar campañas');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id);

    if (campaign.estado !== CampaignStatus.BORRADOR && campaign.estado !== CampaignStatus.PROGRAMADA) {
      throw new BadRequestException('Solo se pueden editar campañas en borrador o programadas');
    }

    const updated = await tenantClient.campaign.update({
      where: { id, tenantId },
      data: {
        ...updateCampaignDto,
        fechaProgramada: updateCampaignDto.fechaProgramada ? new Date(updateCampaignDto.fechaProgramada) : undefined
      }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_UPDATED',
        details: { campaignId: id, cambios: updateCampaignDto }
      }
    }).catch(() => {});

    return updated;
  }

  async duplicate(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden duplicar campañas');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id);

    const duplicated = await tenantClient.campaign.create({
      data: {
        tenantId,
        nombre: campaign.nombre + ' (Copia)',
        descripcion: campaign.descripcion,
        canal: campaign.canal,
        objetivo: campaign.objetivo,
        responsableId: role === 'vendedor' ? userId : campaign.responsableId,
        estado: CampaignStatus.BORRADOR
      }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_DUPLICATED',
        details: { originalId: id, newId: duplicated.id }
      }
    }).catch(() => {});

    return duplicated;
  }

  async changeStatus(tenantId: string, userId: string, userRole: string, id: string, status: CampaignStatus) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar el estado de campañas');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id);
    const updated = await tenantClient.campaign.update({
      where: { id, tenantId },
      data: { estado: status }
    });

    const actionMap: Record<string, string> = {
      [CampaignStatus.PAUSADA]: 'CAMPAIGN_PAUSED',
      [CampaignStatus.PROGRAMADA]: 'CAMPAIGN_RESUMED',
      [CampaignStatus.CANCELADA]: 'CAMPAIGN_CANCELLED',
      [CampaignStatus.ENVIANDO]: 'CAMPAIGN_STARTED',
    };

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: actionMap[status] || `CAMPAIGN_${status}`,
        details: { campaignId: id, nuevoEstado: status, estadoAnterior: campaign.estado }
      }
    }).catch(() => {});

    return updated;
  }

  async getRecipients(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, userId, userRole, id); // Verify access

    return tenantClient.campaignRecipient.findMany({
      where: { campaignId: id, tenantId },
      include: {
        cliente: { select: { id: true, razonSocial: true, telefono: true } },
        lead: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async filterExcludedAndUnconsented<T extends { clienteId?: string | null; leadId?: string | null; id?: string }>(
    tenantClient: any,
    tenantId: string,
    recipients: T[]
  ): Promise<T[]> {
    if (!recipients || recipients.length === 0) return [];

    const clienteIds = recipients
      .map(r => r.clienteId || ('razonSocial' in r || !('phone' in r) ? r.id : undefined))
      .filter(Boolean) as string[];
    const leadIds = recipients
      .map(r => r.leadId || ('phone' in r ? r.id : undefined))
      .filter(Boolean) as string[];

    // Obtener lista de exclusión (OptOut)
    const optOuts = tenantClient.optOut?.findMany
      ? await tenantClient.optOut.findMany({ where: { tenantId } })
      : [];
    const optOutContactIds = new Set(optOuts.map((o: any) => o.contactoId).filter(Boolean));
    const optOutPhones = new Set(optOuts.map((o: any) => o.telefono).filter(Boolean));

    // Obtener consentimientos revocados (NO_CONSENTIDO)
    const noConsents = tenantClient.consent?.findMany
      ? await tenantClient.consent.findMany({
          where: {
            tenantId,
            estado: 'NO_CONSENTIDO'
          }
        })
      : [];
    const noConsentContactIds = new Set(noConsents.map((c: any) => c.contactoId).filter(Boolean));

    // Mapear teléfonos de clientes
    const customerPhones = new Map<string, string[]>();
    if (clienteIds.length > 0 && tenantClient.customer?.findMany) {
      const customers = await tenantClient.customer.findMany({
        where: { id: { in: clienteIds }, tenantId },
        select: { id: true, telefono: true, whatsapp: true }
      });
      if (Array.isArray(customers)) {
        customers.forEach((c: any) => {
          const phones: string[] = [];
          if (c.telefono) phones.push(c.telefono);
          if (c.whatsapp) phones.push(c.whatsapp);
          customerPhones.set(c.id, phones);
        });
      }
    }

    // Mapear teléfonos de leads
    const leadPhones = new Map<string, string[]>();
    if (leadIds.length > 0 && tenantClient.lead?.findMany) {
      const leads = await tenantClient.lead.findMany({
        where: { id: { in: leadIds }, tenantId },
        select: { id: true, phone: true }
      });
      if (Array.isArray(leads)) {
        leads.forEach((l: any) => {
          const phones: string[] = [];
          if (l.phone) phones.push(l.phone);
          leadPhones.set(l.id, phones);
        });
      }
    }

    return recipients.filter(r => {
      const cId = r.clienteId;
      const lId = r.leadId;
      const directId = (r as any).id;

      if (cId && (optOutContactIds.has(cId) || noConsentContactIds.has(cId))) return false;
      if (lId && (optOutContactIds.has(lId) || noConsentContactIds.has(lId))) return false;
      if (directId && (optOutContactIds.has(directId) || noConsentContactIds.has(directId))) return false;

      if (cId && customerPhones.has(cId)) {
        for (const p of customerPhones.get(cId)!) {
          if (optOutPhones.has(p)) return false;
        }
      }
      if (lId && leadPhones.has(lId)) {
        for (const p of leadPhones.get(lId)!) {
          if (optOutPhones.has(p)) return false;
        }
      }
      if (directId) {
        if (customerPhones.has(directId)) {
          for (const p of customerPhones.get(directId)!) {
            if (optOutPhones.has(p)) return false;
          }
        }
        if (leadPhones.has(directId)) {
          for (const p of leadPhones.get(directId)!) {
            if (optOutPhones.has(p)) return false;
          }
        }
      }

      return true;
    });
  }

  async addManualRecipients(tenantId: string, userId: string, userRole: string, id: string, dto: AddRecipientsDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar destinatarios');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id);

    if (campaign.estado !== CampaignStatus.BORRADOR) {
      throw new BadRequestException('Solo se pueden agregar destinatarios en estado BORRADOR');
    }

    const { clienteIds = [], leadIds = [] } = dto;

    if (role === 'vendedor' && clienteIds.length > 0) {
      const allowedCount = await tenantClient.customer.count({
        where: {
          id: { in: clienteIds },
          tenantId,
          OR: [
            { vendedorId: userId },
            { vendedorId: null }
          ]
        }
      });
      if (allowedCount < clienteIds.length) {
        throw new ForbiddenException('Como vendedor, solo puedes agregar tus propios clientes a la campaña');
      }
    }

    const recipientsData: Array<{ tenantId: string; campaignId: string; clienteId?: string; leadId?: string; motivo: string }> = [];

    for (const cid of clienteIds) {
      recipientsData.push({ tenantId, campaignId: id, clienteId: cid, motivo: 'Manual' });
    }
    for (const lid of leadIds) {
      recipientsData.push({ tenantId, campaignId: id, leadId: lid, motivo: 'Manual' });
    }

    const validRecipients = await this.filterExcludedAndUnconsented(tenantClient, tenantId, recipientsData);
    const excluidos = recipientsData.length - validRecipients.length;

    if (validRecipients.length > 0) {
      await tenantClient.campaignRecipient.createMany({
        data: validRecipients,
        skipDuplicates: true
      });
      const totalRecipients = await tenantClient.campaignRecipient.count({
        where: { campaignId: id, tenantId }
      });
      await tenantClient.campaign.update({
        where: { id, tenantId },
        data: { totalDestinatarios: totalRecipients }
      });
    }

    return { 
      message: 'Destinatarios procesados exitosamente', 
      agregados: validRecipients.length,
      excluidosPorOptOut: excluidos 
    };
  }

  async addSegmentRecipients(tenantId: string, userId: string, userRole: string, id: string, segmentId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar destinatarios');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id);

    if (campaign.estado !== CampaignStatus.BORRADOR) {
      throw new BadRequestException('Solo se pueden agregar destinatarios en estado BORRADOR');
    }

    const previewData = await this.segmentsService.preview(tenantId, segmentId);
    if (!previewData || !previewData.data || previewData.data.length === 0) {
      return { message: 'El segmento no devolvió contactos' };
    }

    const recipientsData = previewData.data.map((item: any) => {
      if ('razonSocial' in item) {
        return { tenantId, campaignId: id, clienteId: item.id, motivo: 'Segmento' };
      } else {
        return { tenantId, campaignId: id, leadId: item.id, motivo: 'Segmento' };
      }
    });

    const validRecipients = await this.filterExcludedAndUnconsented(tenantClient, tenantId, recipientsData);
    const excluidos = recipientsData.length - validRecipients.length;

    if (validRecipients.length > 0) {
      await tenantClient.campaignRecipient.createMany({
        data: validRecipients,
        skipDuplicates: true
      });
      const totalRecipients = await tenantClient.campaignRecipient.count({
        where: { campaignId: id, tenantId }
      });
      await tenantClient.campaign.update({
        where: { id, tenantId },
        data: { totalDestinatarios: totalRecipients }
      });
    }

    return { 
      message: 'Destinatarios agregados exitosamente desde segmento', 
      agregados: validRecipients.length,
      excluidosPorOptOut: excluidos 
    };
  }

  async removeRecipient(tenantId: string, userId: string, userRole: string, campaignId: string, recipientId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar destinatarios');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, campaignId);
    
    if (campaign.estado !== CampaignStatus.BORRADOR) {
      throw new BadRequestException('Solo se pueden quitar destinatarios en estado BORRADOR');
    }

    return tenantClient.campaignRecipient.delete({
      where: { id: recipientId, tenantId, campaignId }
    });
  }

  async remove(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden eliminar campañas');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id); // Verify ownership/access

    if (role !== 'admin' && role !== 'gerente' && campaign.responsableId !== userId) {
      throw new ForbiddenException('Solo puedes eliminar tus propias campañas');
    }

    const deleted = await tenantClient.campaign.delete({
      where: { id, tenantId }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_DELETED',
        details: { campaignId: id, nombre: campaign.nombre }
      }
    }).catch(() => {});

    return deleted;
  }

  async prepare(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = this.normalizeRole(userRole);

    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden preparar campañas');
    }

    const campaign = await this.findOne(tenantId, userId, userRole, id);

    if (campaign.estado !== CampaignStatus.BORRADOR) {
      throw new BadRequestException('La campaña debe estar en BORRADOR para prepararla');
    }

    const tenantConfig = tenantClient.campaignConfig?.findUnique
      ? await tenantClient.campaignConfig.findUnique({ where: { tenantId } })
      : null;

    let templateCuerpo = campaign.mensajePersonalizado;
    if (campaign.plantillaId) {
      const plantilla = await tenantClient.campaignTemplate.findUnique({ where: { id: campaign.plantillaId } });
      if (plantilla) {
        templateCuerpo = plantilla.cuerpo;
      }
    }

    if (!templateCuerpo && tenantConfig?.mensajePredeterminado) {
      templateCuerpo = tenantConfig.mensajePredeterminado;
    }

    if (!templateCuerpo && !campaign.enviarConIA) {
      throw new BadRequestException('La campaña debe tener una plantilla, mensaje personalizado o tener IA activada.');
    }

    const recipients = await tenantClient.campaignRecipient.findMany({
      where: { campaignId: id, tenantId },
      include: {
        cliente: true,
        lead: true
      }
    });

    if (recipients.length === 0) {
      throw new BadRequestException('No hay destinatarios en la campaña');
    }

    // Borrar mensajes anteriores si se vuelve a preparar
    await tenantClient.campaignMessage.deleteMany({
      where: { campaignId: id, tenantId }
    });

    const messagesToCreate = recipients.map((r: any) => {
      let finalContent = templateCuerpo || '';
      
      // Reemplazo simple de variables
      if (finalContent) {
        const contact = r.cliente || r.lead;
        if (contact) {
          finalContent = finalContent
            .replace(/\{\{nombre\}\}/g, (contact as any).nombreComercial || (contact as any).name || '')
            .replace(/\{\{empresa\}\}/g, (contact as any).razonSocial || (contact as any).companyName || '')
            .replace(/\{\{telefono\}\}/g, contact.telefono || (contact as any).phone || '');
        }
      }

      // Anexar firma institucional si existe
      if (tenantConfig?.firma && finalContent) {
        finalContent = `${finalContent}\n\n${tenantConfig.firma}`;
      }

      return {
        tenantId,
        campaignId: id,
        recipientId: r.id,
        plantillaId: campaign.plantillaId,
        contenido: finalContent,
        estado: CampaignMessageStatus.PENDIENTE
      };
    });

    await tenantClient.campaignMessage.createMany({
      data: messagesToCreate
    });

    return { message: 'Campaña preparada', count: messagesToCreate.length };
  }

  async approve(tenantId: string, userId: string, userRole: string, id: string) {
    const role = this.normalizeRole(userRole);
    if (role !== 'admin' && role !== 'gerente') {
      throw new ForbiddenException('Solo un administrador o gerente puede aprobar campañas');
    }
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, userId, userRole, id);
    
    const approved = await tenantClient.campaign.update({
      where: { id, tenantId },
      data: { aprobada: true }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_APPROVED',
        details: { campaignId: id }
      }
    }).catch(() => {});

    return approved;
  }

  async schedule(tenantId: string, userId: string, userRole: string, id: string, fechaEnvioProgramado: string) {
    const role = this.normalizeRole(userRole);
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden programar campañas');
    }

    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await this.findOne(tenantId, userId, userRole, id);
    
    const tenantConfig = tenantClient.campaignConfig?.findUnique
      ? await tenantClient.campaignConfig.findUnique({ where: { tenantId } })
      : null;

    if (tenantConfig && tenantConfig.campanasActivas === false) {
      throw new BadRequestException('Las campañas están deshabilitadas temporalmente en la configuración');
    }

    const requiereAprobacion = tenantConfig ? tenantConfig.aprobacionObligatoria : true;
    if (requiereAprobacion && !campaign.aprobada) {
      throw new BadRequestException('La campaña debe ser aprobada antes de programarse');
    }

    const scheduled = await tenantClient.campaign.update({
      where: { id, tenantId },
      data: { 
        estado: CampaignStatus.PROGRAMADA,
        fechaEnvioProgramado: new Date(fechaEnvioProgramado)
      }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_SCHEDULED',
        details: { campaignId: id, fechaEnvioProgramado }
      }
    }).catch(() => {});

    return scheduled;
  }

  async start(tenantId: string, userId: string, userRole: string, id: string) {
    const role = this.normalizeRole(userRole);
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden iniciar campañas');
    }

    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await this.findOne(tenantId, userId, userRole, id);
    
    const tenantConfig = tenantClient.campaignConfig?.findUnique
      ? await tenantClient.campaignConfig.findUnique({ where: { tenantId } })
      : null;

    if (tenantConfig && tenantConfig.campanasActivas === false) {
      throw new BadRequestException('Las campañas están deshabilitadas temporalmente en la configuración');
    }

    const requiereAprobacion = tenantConfig ? tenantConfig.aprobacionObligatoria : true;
    if (requiereAprobacion && !campaign.aprobada) {
      throw new BadRequestException('La campaña debe ser aprobada antes de iniciarse');
    }

    const started = await tenantClient.campaign.update({
      where: { id, tenantId },
      data: { estado: CampaignStatus.ENVIANDO }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_STARTED',
        details: { campaignId: id, totalDestinatarios: campaign.totalDestinatarios }
      }
    }).catch(() => {});

    return started;
  }

  async getMessages(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, userId, userRole, id);

    return tenantClient.campaignMessage.findMany({
      where: { campaignId: id, tenantId },
      include: {
        recipient: {
          include: { cliente: true, lead: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async retryFailed(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, userId, userRole, id);

    const updated = await tenantClient.campaignMessage.updateMany({
      where: { campaignId: id, tenantId, estado: CampaignMessageStatus.FALLIDO },
      data: { estado: CampaignMessageStatus.PENDIENTE, errorMensaje: null }
    });

    if (updated.count > 0) {
      await tenantClient.campaign.update({
        where: { id, tenantId },
        data: { estado: CampaignStatus.ENVIANDO }
      });
    }

    return { message: 'Reintentos programados', count: updated.count };
  }

  async generateMessage(tenantId: string, userId: string, userRole: string, id: string, prompt: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const aiConfig = await tenantClient.aIConfiguration.findUnique({ where: { tenantId } });
    
    if (!aiConfig || !aiConfig.habilitada || !aiConfig.apiKey) {
      throw new BadRequestException('IA no configurada');
    }

    const messages = [
      { role: 'system', content: 'Eres un experto copywriter de marketing. Tu tarea es generar un mensaje para una campaña, usando tono persuasivo y variables como {{nombre}}, {{empresa}}. Sólo devuelve el texto del mensaje sugerido.' },
      { role: 'user', content: prompt }
    ];

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: aiConfig.defaultModel || 'openai/gpt-4o-mini',
          messages,
          temperature: Number(aiConfig.temperature || 0.7)
        })
      });

      if (!res.ok) throw new Error('Error en API LLM');

      const data = await res.json();
      const sugerencia = data.choices[0]?.message?.content || '';

      // Registrar Uso (simplificado)
      await tenantClient.aIUsage.create({
        data: {
          tenantId,
          usuarioId: userId,
          agente: 'marketing',
          modelo: aiConfig.defaultModel,
          tipoOperacion: 'OTRO',
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      });

      return { propuesta: sugerencia };
    } catch (e: any) {
      throw new BadRequestException('Falló la generación con IA: ' + e.message);
    }
  }


  async updateVelocity(tenantId: string, role: any, id: string, dto: any) {
    if (role.name !== 'Admin' && role.name !== 'Gerente') {
      throw new UnauthorizedException('Solo Admin/Gerente pueden modificar la velocidad');
    }
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.campaign.update({
      where: { id },
      data: {
        limiteMensajesPorHora: dto.limiteMensajesPorHora,
        intervaloEntreEnviosMs: dto.intervaloEntreEnviosMs,
        concurrencia: dto.concurrencia,
        maxReintentos: dto.maxReintentos,
        pausada: dto.pausada
      }
    });
  }

  async getVelocity(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await tenantClient.campaign.findUnique({
      where: { id },
      select: {
        limiteMensajesPorHora: true,
        intervaloEntreEnviosMs: true,
        concurrencia: true,
        maxReintentos: true,
        pausada: true
      }
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return campaign;
  }

  async getStats(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await tenantClient.campaign.findUnique({
      where: { id },
      select: {
        totalDestinatarios: true,
        totalEnviados: true,
        totalEntregados: true,
        totalFallidos: true,
        totalRespuestas: true,
        totalLeads: true,
        totalCotizaciones: true,
        totalVentas: true
      }
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const tasaRespuesta = campaign.totalEnviados > 0 
      ? ((campaign.totalRespuestas / campaign.totalEnviados) * 100).toFixed(2) 
      : 0;

    return {
      ...campaign,
      tasaRespuesta: Number(tasaRespuesta)
    };
  }

  


  private async prioritizeInactiveClients(
    tenantClient: any,
    tenantId: string,
    userId: string,
    clientsData: Array<{ id: string; nombre: string; totalPurchases: number; orderCount: number; daysInactive: number }>,
    priorizarConIA: boolean
  ): Promise<Map<string, Priority>> {
    const priorityMap = new Map<string, Priority>();

    if (priorizarConIA && clientsData.length > 0) {
      try {
        const aiConfig = await tenantClient.aIConfiguration.findUnique({ where: { tenantId } });
        if (aiConfig && aiConfig.apiKey) {
          const sample = clientsData.slice(0, 30); // Limitar lote a OpenRouter
          const prompt = `Clasifica a cada uno de los siguientes clientes inactivos en prioridad ALTA, MEDIA o BAJA para recuperación comercial considerando su volumen de compras, frecuencia y días inactivo.
Responde ÚNICAMENTE un JSON válido con la forma: {"clasificaciones": [{"id": "UUID", "prioridad": "ALTA" | "MEDIA" | "BAJA"}]}.
Clientes:
${JSON.stringify(sample.map(c => ({ id: c.id, nombre: c.nombre, comprasTotales: c.totalPurchases, cantidadPedidos: c.orderCount, diasInactivo: c.daysInactive })))}`;

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${aiConfig.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: aiConfig.defaultModel || 'openai/gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2
            })
          });

          if (res.ok) {
            const data = await res.json();
            const rawContent = data.choices[0]?.message?.content || '{}';
            const cleanJson = rawContent.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed.clasificaciones)) {
              for (const item of parsed.clasificaciones) {
                if (item.id && ['ALTA', 'MEDIA', 'BAJA'].includes(item.prioridad)) {
                  priorityMap.set(item.id, item.prioridad as Priority);
                }
              }
            }

            // Registrar uso IA
            await tenantClient.aIUsage.create({
              data: {
                tenantId,
                usuarioId: userId,
                agente: 'marketing',
                modelo: aiConfig.defaultModel || 'openai/gpt-4o-mini',
                tipoOperacion: 'OTRO',
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        Logger.warn(`Fallback a priorización heurística: ${err}`, 'CampaignsService');
      }
    }

    // Heurística de respaldo determinista (o default si priorizarConIA = false)
    for (const c of clientsData) {
      if (!priorityMap.has(c.id)) {
        if (c.totalPurchases >= 5000 || c.orderCount >= 4) {
          priorityMap.set(c.id, Priority.ALTA);
        } else if (c.totalPurchases >= 1000 || c.orderCount >= 2) {
          priorityMap.set(c.id, Priority.MEDIA);
        } else {
          priorityMap.set(c.id, Priority.BAJA);
        }
      }
    }

    return priorityMap;
  }

  async createAutoRecoveryCampaign(tenantId: string, userId: string, userRole: any, dto: AutoRecoverInactiveDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const diasInactivo = Number(dto.diasInactivo) || 90;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - diasInactivo);

    const customers = await tenantClient.customer.findMany({
      where: { tenantId, estado: 'ACTIVO' },
      include: {
        orders: {
          select: { id: true, total: true, fecha: true, estado: true },
          orderBy: { fecha: 'desc' }
        }
      }
    });

    const inactiveCustomersData: Array<{ id: string; nombre: string; totalPurchases: number; orderCount: number; daysInactive: number }> = [];

    for (const c of customers) {
      const orders = c.orders || [];
      if (orders.length > 0) {
        const lastOrder = orders[0];
        if (new Date(lastOrder.fecha) < dateLimit) {
          const totalPurchases = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
          const daysInactive = Math.floor((Date.now() - new Date(lastOrder.fecha).getTime()) / (1000 * 60 * 60 * 24));
          inactiveCustomersData.push({
            id: c.id,
            nombre: c.nombreComercial || c.razonSocial || 'Cliente',
            totalPurchases,
            orderCount: orders.length,
            daysInactive
          });
        }
      }
    }

    const filteredInactive = await this.filterExcludedAndUnconsented(
      tenantClient,
      tenantId,
      inactiveCustomersData.map(c => ({ ...c, clienteId: c.id }))
    );

    const priorityMap = await this.prioritizeInactiveClients(
      tenantClient,
      tenantId,
      userId,
      filteredInactive,
      Boolean(dto.priorizarConIA)
    );

    const segment = await tenantClient.segment.create({
      data: {
        tenantId,
        nombre: `Segmento Auto: Inactivos > ${diasInactivo}d`,
        descripcion: `Segmento generado automáticamente con clientes sin compras en los últimos ${diasInactivo} días`,
        tipoSegmento: 'CLIENTES',
        condiciones: {
          diasInactivo,
          priorizarConIA: Boolean(dto.priorizarConIA),
          totalEncontrados: filteredInactive.length
        }
      }
    });

    const campaign = await tenantClient.campaign.create({
      data: {
        tenantId,
        nombre: dto.nombre || `Recuperación Inactivos (> ${diasInactivo} días)`,
        descripcion: `Campaña automática de recuperación para clientes inactivos por más de ${diasInactivo} días`,
        canal: dto.canal || 'WHATSAPP',
        objetivo: 'RETENCION',
        tipo: CampaignType.AUTOMATICA_RECUPERACION,
        eventoDisparador: CampaignTrigger.CLIENTE_INACTIVO,
        responsableId: userId,
        activaAutomatica: true,
        segmentoId: segment.id,
        estado: CampaignStatus.BORRADOR,
        totalDestinatarios: filteredInactive.length
      }
    });

    if (filteredInactive.length > 0) {
      const recipientsData = filteredInactive.map((c: any) => ({
        tenantId,
        campaignId: campaign.id,
        clienteId: c.clienteId || c.id,
        prioridad: priorityMap.get(c.clienteId || c.id) || Priority.MEDIA,
        motivo: `Inactividad > ${diasInactivo} días`
      }));

      await tenantClient.campaignRecipient.createMany({
        data: recipientsData,
        skipDuplicates: true
      });
    }

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_CREATE_AUTO_RECOVERY',
        details: { campaignId: campaign.id, diasInactivo, count: filteredInactive.length, priorizarConIA: dto.priorizarConIA }
      }
    }).catch(() => {});

    return {
      campaign,
      segment,
      totalDestinatarios: filteredInactive.length
    };
  }

  async createAutoProductCampaign(tenantId: string, userId: string, userRole: any, dto: AutoProductDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const product = await tenantClient.product.findUnique({
      where: { id: dto.productoId, tenantId }
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const orderItems = await tenantClient.orderItem.findMany({
      where: {
        tenantId,
        productId: dto.productoId,
        order: { estado: 'ENTREGADO' }
      },
      select: {
        order: { select: { clienteId: true } }
      }
    });

    const uniqueCustomerIds = Array.from(
      new Set(orderItems.map((oi: any) => oi.order?.clienteId).filter(Boolean))
    ) as string[];

    const recipientsCandidates = uniqueCustomerIds.map((cid) => ({ clienteId: cid }));
    const filteredCandidates = await this.filterExcludedAndUnconsented(tenantClient, tenantId, recipientsCandidates);
    const validCustomerIds = filteredCandidates.map(c => c.clienteId!).filter(Boolean);

    const segment = await tenantClient.segment.create({
      data: {
        tenantId,
        nombre: `Segmento Auto: Compradores de ${product.nombre}`,
        descripcion: `Clientes con pedidos entregados del producto ${product.nombre}`,
        tipoSegmento: 'CLIENTES',
        condiciones: {
          productoId: dto.productoId,
          totalCompradores: validCustomerIds.length
        }
      }
    });

    const campaign = await tenantClient.campaign.create({
      data: {
        tenantId,
        nombre: dto.nombre || `Campaña Producto: ${product.nombre}`,
        descripcion: `Campaña automática dirigida a compradores de ${product.nombre}`,
        canal: dto.canal || 'WHATSAPP',
        objetivo: 'VENTAS',
        tipo: CampaignType.AUTOMATICA_PRODUCTO,
        eventoDisparador: CampaignTrigger.NUEVO_PRODUCTO,
        productoId: dto.productoId,
        responsableId: userId,
        activaAutomatica: true,
        segmentoId: segment.id,
        estado: CampaignStatus.BORRADOR,
        totalDestinatarios: validCustomerIds.length
      }
    });

    if (validCustomerIds.length > 0) {
      const recipientsData = validCustomerIds.map((cid) => ({
        tenantId,
        campaignId: campaign.id,
        clienteId: cid,
        productoInteresId: dto.productoId,
        prioridad: Priority.MEDIA,
        motivo: 'Comprador previo del producto'
      }));

      await tenantClient.campaignRecipient.createMany({
        data: recipientsData,
        skipDuplicates: true
      });
    }

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_CREATE_AUTO_PRODUCT',
        details: { campaignId: campaign.id, productoId: dto.productoId, count: validCustomerIds.length }
      }
    }).catch(() => {});

    return {
      campaign,
      segment,
      totalDestinatarios: validCustomerIds.length
    };
  }

  async createAutoVendorCampaign(tenantId: string, userId: string, userRole: any, dto: AutoVendorDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const roleName = typeof userRole === 'string' ? userRole.toLowerCase() : userRole?.name?.toLowerCase();
    const isPrivileged = roleName === 'admin' || roleName === 'gerente';

    if (!isPrivileged && dto.vendedorId !== userId) {
      throw new ForbiddenException('Un vendedor solo puede crear campañas para su propia cartera de clientes');
    }

    const vendor = await tenantClient.user.findUnique({
      where: { id: dto.vendedorId, tenantId }
    });
    if (!vendor) throw new NotFoundException('Vendedor no encontrado');

    const customers = await tenantClient.customer.findMany({
      where: { tenantId, vendedorId: dto.vendedorId, estado: 'ACTIVO' },
      select: { id: true, nombreComercial: true }
    });

    const recipientsCandidates = customers.map((c: any) => ({ clienteId: c.id, ...c }));
    const filteredCandidates = await this.filterExcludedAndUnconsented(tenantClient, tenantId, recipientsCandidates);

    const segment = await tenantClient.segment.create({
      data: {
        tenantId,
        nombre: `Segmento Auto: Cartera ${vendor.name}`,
        descripcion: `Cartera de clientes asignada al vendedor ${vendor.name}`,
        tipoSegmento: 'CLIENTES',
        condiciones: {
          vendedorId: dto.vendedorId,
          totalClientes: filteredCandidates.length
        }
      }
    });

    const campaign = await tenantClient.campaign.create({
      data: {
        tenantId,
        nombre: dto.nombre || `Campaña Cartera: ${vendor.name}`,
        descripcion: `Campaña automática para clientes de ${vendor.name}`,
        canal: dto.canal || 'WHATSAPP',
        objetivo: 'VENTAS',
        tipo: CampaignType.AUTOMATICA_VENDEDOR,
        vendedorObjetivoId: dto.vendedorId,
        responsableId: dto.vendedorId,
        activaAutomatica: true,
        segmentoId: segment.id,
        estado: CampaignStatus.BORRADOR,
        totalDestinatarios: filteredCandidates.length
      }
    });

    if (filteredCandidates.length > 0) {
      const recipientsData = filteredCandidates.map((c: any) => ({
        tenantId,
        campaignId: campaign.id,
        clienteId: c.clienteId || c.id,
        prioridad: Priority.MEDIA,
        motivo: 'Cartera de vendedor'
      }));

      await tenantClient.campaignRecipient.createMany({
        data: recipientsData,
        skipDuplicates: true
      });
    }

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_CREATE_AUTO_VENDOR',
        details: { campaignId: campaign.id, vendedorId: dto.vendedorId, count: filteredCandidates.length }
      }
    }).catch(() => {});

    return {
      campaign,
      segment,
      totalDestinatarios: filteredCandidates.length
    };
  }

  async getBoard(tenantId: string, role: any, userId: string, query: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const where: any = { tenantId };

    const roleName = typeof role === 'string' ? role.toLowerCase() : role?.name?.toLowerCase();
    const isVendedor = roleName === 'vendedor';

    if (isVendedor) {
      where.OR = [
        { responsableId: userId },
        { vendedorObjetivoId: userId }
      ];
    } else if (query.responsableId) {
      where.responsableId = query.responsableId;
    }

    if (query.estado) where.estado = query.estado;
    if (query.canal) where.canal = query.canal;
    if (query.tipo) where.tipo = query.tipo;
    if (query.search) {
      where.nombre = { contains: query.search, mode: 'insensitive' };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      tenantClient.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          responsable: { select: { id: true, name: true } },
          vendedorObjetivo: { select: { id: true, name: true } },
          productoObjetivo: { select: { id: true, nombre: true, sku: true } },
          segmento: { select: { id: true, nombre: true } }
        }
      }),
      tenantClient.campaign.count({ where })
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getSummary(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await tenantClient.campaign.findUnique({
      where: { id, tenantId },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        estado: true,
        canal: true,
        objetivo: true,
        totalDestinatarios: true,
        totalEnviados: true,
        totalEntregados: true,
        totalRespuestas: true,
        totalLeads: true,
        totalLeadsGenerados: true,
        totalClientesVinculados: true,
        totalActividadesGeneradas: true
      }
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return campaign;
  }

  async processResponse(tenantId: string, campaignId: string, recipientId: string, mensaje: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);

    return await tenantClient.$transaction(async (tx: any) => {
      const recipient = await tx.campaignRecipient.findUnique({
        where: { id: recipientId },
        include: { cliente: true, lead: true, campaign: true }
      });

      if (!recipient) throw new NotFoundException('Destinatario no encontrado');

      // 1. Marcar como respondido
      await tx.campaignRecipient.update({
        where: { id: recipientId },
        data: { respondio: true, fechaRespuesta: new Date() }
      });

      // 2. Actualizar el mensaje de la campaña a entregado si existía
      const msg = await tx.campaignMessage.findFirst({
        where: { campaignId, recipientId },
        orderBy: { createdAt: 'desc' }
      });

      if (msg && msg.estado !== 'ENTREGADO') {
        await tx.campaignMessage.update({
          where: { id: msg.id },
          data: { estado: 'ENTREGADO', fechaEntregado: new Date(), fechaRespuesta: new Date() }
        });
        await tx.campaign.update({
          where: { id: campaignId },
          data: { totalEntregados: { increment: 1 } }
        });
      } else if (msg) {
        await tx.campaignMessage.update({
          where: { id: msg.id },
          data: { fechaRespuesta: new Date() }
        });
      }

      await tx.campaign.update({
        where: { id: campaignId },
        data: { totalRespuestas: { increment: 1 } }
      });

      const campaign = recipient.campaign;
      const telefono = recipient.cliente?.telefono || recipient.cliente?.whatsapp || recipient.lead?.phone || (recipient.lead as any)?.telefono;

      // 3. Buscar si el contacto ya existe como Cliente
      let existingCustomer: any = null;
      if (recipient.clienteId) {
        existingCustomer = await tx.customer.findUnique({ where: { id: recipient.clienteId } });
      } else if (telefono) {
        existingCustomer = await tx.customer.findFirst({
          where: {
            tenantId,
            OR: [
              { telefono },
              { whatsapp: telefono }
            ]
          }
        });
      }

      if (existingCustomer) {
        // Contacto es Cliente: crear Actividad de seguimiento y vincular
        const act = await tx.activity.create({
          data: {
            tenantId,
            tipo: 'SEGUIMIENTO',
            titulo: `Respuesta a campaña ${campaign.nombre}`,
            descripcion: mensaje || 'El cliente respondió a la campaña.',
            fecha: new Date(),
            responsableId: existingCustomer.vendedorId || campaign.responsableId,
            clienteId: existingCustomer.id
          }
        });

        await tx.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            clienteVinculadoId: existingCustomer.id,
            actividadGeneradaId: act.id
          }
        });

        await tx.campaign.update({
          where: { id: campaignId },
          data: { 
            totalClientesVinculados: { increment: 1 },
            totalActividadesGeneradas: { increment: 1 }
          }
        });

        return {
          success: true,
          resultType: 'CUSTOMER_ACTIVITY_CREATED',
          customerId: existingCustomer.id,
          activityId: act.id
        };
      } else {
        // No existe como Cliente: Crear o asociar Lead
        let lead: any = null;
        if (recipient.leadId) {
          lead = await tx.lead.findUnique({ where: { id: recipient.leadId } });
        } else if (telefono) {
          lead = await tx.lead.findFirst({
            where: { tenantId, phone: telefono }
          });
        }

        if (!lead) {
          lead = await tx.lead.create({
            data: {
              tenantId,
              name: recipient.cliente?.nombreComercial || recipient.lead?.name || 'Contacto Campaña',
              phone: telefono || 'Sin teléfono',
              fuente: `Campaña: ${campaign.nombre}`,
              estado: 'NUEVO',
              vendedorId: campaign.responsableId,
              observaciones: mensaje
            }
          });
        }

        await tx.campaignRecipient.update({
          where: { id: recipientId },
          data: { leadGeneradoId: lead.id }
        });

        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            totalLeads: { increment: 1 },
            totalLeadsGenerados: { increment: 1 }
          }
        });

        return {
          success: true,
          resultType: 'LEAD_CREATED_OR_LINKED',
          leadId: lead.id
        };
      }
    });
  }

  async getCosts(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await this.findOne(tenantId, userId, userRole, id);

    const costs = await tenantClient.campaignCost.findMany({
      where: { campaignId: id, tenantId },
      orderBy: { fechaRegistro: 'desc' }
    });

    return {
      campaignId: id,
      costoTotal: Number(campaign.costoTotal || 0),
      moneda: 'USD',
      desglose: costs,
      resumen: {
        totalDestinatarios: campaign.totalDestinatarios,
        totalEnviados: campaign.totalEnviados,
        costoUnitarioEstimado: costs.length > 0 ? Number(costs[0].costoUnitario) : 0.05
      }
    };
  }

  async calculateCosts(tenantId: string, userId: string, userRole: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const campaign = await this.findOne(tenantId, userId, userRole, id);

    const tenantConfig = tenantClient.campaignConfig?.findUnique
      ? await tenantClient.campaignConfig.findUnique({ where: { tenantId } })
      : null;

    let unitCost = 0.05;
    const canalUpper = (campaign.canal || 'WHATSAPP').toUpperCase();

    if (canalUpper === 'WHATSAPP') {
      unitCost = tenantConfig?.costoPorMensajeWhatsapp ? Number(tenantConfig.costoPorMensajeWhatsapp) : 0.05;
    } else if (canalUpper === 'SMS') {
      unitCost = tenantConfig?.costoPorMensajeSms ? Number(tenantConfig.costoPorMensajeSms) : 0.02;
    } else if (canalUpper === 'EMAIL') {
      unitCost = 0.001;
    }

    const countEnviados = await tenantClient.campaignMessage.count({
      where: {
        campaignId: id,
        tenantId,
        estado: { in: [CampaignMessageStatus.PROCESANDO, CampaignMessageStatus.ENVIADO, CampaignMessageStatus.ENTREGADO] }
      }
    });

    const totalMensajes = countEnviados > 0 ? countEnviados : (campaign.totalEnviados || 0);
    const totalCost = Number((unitCost * totalMensajes).toFixed(4));

    const costRecord = await tenantClient.campaignCost.create({
      data: {
        tenantId,
        campaignId: id,
        canal: campaign.canal || 'WHATSAPP',
        costoUnitario: unitCost,
        cantidadMensajes: totalMensajes,
        costoTotal: totalCost,
        moneda: 'USD'
      }
    });

    await tenantClient.campaign.update({
      where: { id, tenantId },
      data: { costoTotal: totalCost }
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_CALCULATE_COSTS',
        details: { campaignId: id, totalCost, totalMensajes, unitCost, canal: campaign.canal }
      }
    }).catch(() => {});

    return {
      campaignId: id,
      costoUnitario: unitCost,
      cantidadMensajes: totalMensajes,
      costoTotal: totalCost,
      moneda: 'USD',
      recordId: costRecord.id
    };
  }
}