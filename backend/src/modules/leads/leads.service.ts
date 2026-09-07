import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { CreateLeadTouchpointDto } from './dto/create-touchpoint.dto.js';
import { UpdateLeadTouchpointDto } from './dto/update-touchpoint.dto.js';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  // Resuelve un tenantId válido en la base de datos si el provisto es inválido o default
  private async resolveTenantId(tenantId: string): Promise<string> {
    if (tenantId && tenantId !== '00000000-0000-0000-0000-000000000000') {
      try {
        if (this.prisma.tenant?.findUnique) {
          const exists = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
          if (exists) return tenantId;
        } else {
          return tenantId;
        }
      } catch {
        // En caso de que no sea UUID válido
      }
    }
    try {
      if (this.prisma.tenant?.findFirst) {
        const defaultTenant = await this.prisma.tenant.findFirst();
        if (defaultTenant) return defaultTenant.id;
      }
    } catch {}
    return tenantId;
  }

  // Resuelve un vendedorId válido si existe y pertenece al tenant; si no, retorna null sin bloquear la operación
  private async resolveVendedorId(vendedorId: string | undefined, usuarioId: string | undefined, tenantId: string): Promise<string | null> {
    const candidateId = vendedorId || (usuarioId && usuarioId !== '00000000-0000-0000-0000-000000000000' ? usuarioId : undefined);
    if (!candidateId) return null;

    try {
      if (this.prisma.user?.findUnique) {
        const user = await this.prisma.user.findUnique({
          where: { id: candidateId },
        });
        if (user && user.tenantId === tenantId) {
          return user.id;
        }
      }
    } catch {
      // Ignorar si el identificador no es UUID o falla la búsqueda
    }
    return null;
  }

  async create(createLeadDto: CreateLeadDto, tenantId: string, usuarioId?: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    // Normalizar campos español/inglés
    const name = (createLeadDto.name || createLeadDto.nombre || '').trim();
    if (!name) {
      throw new BadRequestException('El nombre del lead es obligatorio.');
    }

    const companyName = createLeadDto.companyName || createLeadDto.empresa || null;
    const phone = createLeadDto.phone || createLeadDto.telefono || null;
    const ciudad = createLeadDto.ciudad || createLeadDto.city || null;
    const fuente = createLeadDto.fuente || createLeadDto.source || null;
    const vendedorId = await this.resolveVendedorId(createLeadDto.vendedorId, usuarioId, effectiveTenantId);

    const count = await tenantClient.lead.count();
    const leadId = `LEAD-${(count + 1).toString().padStart(3, '0')}`;

    return tenantClient.lead.create({
      data: {
        tenantId: effectiveTenantId,
        leadId,
        name,
        companyName,
        email: createLeadDto.email || null,
        phone,
        ciudad,
        fuente,
        productoInteres: createLeadDto.productoInteres || null,
        observaciones: createLeadDto.observaciones || null,
        estado: createLeadDto.estado || LeadStatus.NUEVO,
        motivoPerdida: createLeadDto.motivoPerdida || null,
        proximoSeguimiento: createLeadDto.proximoSeguimiento ? new Date(createLeadDto.proximoSeguimiento) : null,
        vendedorId,
      },
    });
  }

  async findAll(tenantId: string, page: number = 1, limit: number = 10, estado?: string, search?: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const skip = (page - 1) * limit;

    const where: any = { activo: true };
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      tenantClient.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendedor: { select: { name: true, email: true } },
          _count: { select: { touchpoints: true, activities: true } },
        },
      }),
      tenantClient.lead.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const lead = await tenantClient.lead.findFirst({
      where: { id, activo: true },
      include: {
        activities: { orderBy: { fecha: 'desc' } },
        touchpoints: { orderBy: { fecha: 'desc' } },
        vendedor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!lead) throw new NotFoundException('Lead no encontrado');
    return lead;
  }

  async update(id: string, updateData: UpdateLeadDto, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    if (updateData.estado === LeadStatus.PERDIDO && !updateData.motivoPerdida) {
      throw new BadRequestException('El motivo de pérdida es obligatorio.');
    }

    // Normalización
    const name = updateData.name || updateData.nombre;
    const companyName = updateData.companyName !== undefined ? updateData.companyName : updateData.empresa;
    const phone = updateData.phone !== undefined ? updateData.phone : updateData.telefono;
    const ciudad = updateData.ciudad !== undefined ? updateData.ciudad : updateData.city;
    const fuente = updateData.fuente !== undefined ? updateData.fuente : updateData.source;

    let vendedorIdToSet: string | null | undefined = undefined;
    if (updateData.vendedorId !== undefined) {
      vendedorIdToSet = await this.resolveVendedorId(updateData.vendedorId, undefined, effectiveTenantId);
    }

    await this.findOne(id, effectiveTenantId);

    const dataToUpdate: any = {
      ...(name && { name }),
      ...(companyName !== undefined && { companyName }),
      ...(phone !== undefined && { phone }),
      ...(updateData.email !== undefined && { email: updateData.email }),
      ...(ciudad !== undefined && { ciudad }),
      ...(fuente !== undefined && { fuente }),
      ...(updateData.productoInteres !== undefined && { productoInteres: updateData.productoInteres }),
      ...(updateData.observaciones !== undefined && { observaciones: updateData.observaciones }),
      ...(updateData.estado !== undefined && { estado: updateData.estado }),
      ...(updateData.motivoPerdida !== undefined && { motivoPerdida: updateData.motivoPerdida }),
      ...(updateData.proximoSeguimiento !== undefined && {
        proximoSeguimiento: updateData.proximoSeguimiento ? new Date(updateData.proximoSeguimiento) : null,
      }),
      ...(vendedorIdToSet !== undefined && { vendedorId: vendedorIdToSet }),
    };

    return tenantClient.lead.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(id, tenantId);

    return tenantClient.lead.update({
      where: { id },
      data: { activo: false },
    });
  }

  async convertToCustomer(id: string, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const lead = await this.findOne(id, tenantId);

    if (lead.estado === LeadStatus.GANADO) {
      throw new BadRequestException('El lead ya fue convertido a cliente.');
    }

    return tenantClient.$transaction(async (tx: any) => {
      const updatedLead = await tx.lead.update({
        where: { id },
        data: { estado: LeadStatus.GANADO },
      });

      const customer = await tx.customer.create({
        data: {
          tenantId,
          leadId: id,
          nombreComercial: lead.companyName || lead.name,
          razonSocial: lead.companyName || lead.name,
          personaContacto: lead.name,
          email: lead.email,
          telefono: lead.phone,
          ciudad: lead.ciudad,
          vendedorId: lead.vendedorId,
          tipoCliente: 'NUEVO',
          estado: 'ACTIVO',
        },
      });

      let activityUserId = lead.vendedorId;
      if (!activityUserId && tx.user?.findFirst) {
        const anyUser = await tx.user.findFirst({ where: { tenantId } });
        if (anyUser) activityUserId = anyUser.id;
      }

      if (activityUserId) {
        await tx.leadActivity.create({
          data: {
            tenantId,
            leadId: id,
            usuarioId: activityUserId,
            tipo: 'OTRO',
            descripcion: 'Lead convertido a Cliente de forma automática.',
            completada: true,
          },
        });
      }

      return { lead: updatedLead, customer };
    });
  }

  // ----------------------------------------------------
  // HISTORIAL DE SEGUIMIENTO (TOUCHPOINTS)
  // ----------------------------------------------------

  async createTouchpoint(leadId: string, dto: CreateLeadTouchpointDto, tenantId: string, usuarioId?: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(leadId, tenantId);

    return tenantClient.leadTouchpoint.create({
      data: {
        tenantId,
        leadId,
        canal: dto.canal,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        participanteInterno: dto.participanteInterno || null,
        participanteExterno: dto.participanteExterno || null,
        resumen: dto.resumen || null,
        objeciones: dto.objeciones || null,
        puntosInteres: dto.puntosInteres || null,
        preferenciasContacto: dto.preferenciasContacto || null,
        materialEnviado: dto.materialEnviado || null,
        materialAbierto: dto.materialAbierto ?? false,
        respuestaMaterial: dto.respuestaMaterial || null,
        etapa: dto.etapa || 'PROSPECTO',
        compromisosPendientes: dto.compromisosPendientes || null,
        fechaRecontacto: dto.fechaRecontacto ? new Date(dto.fechaRecontacto) : null,
      },
    });
  }

  async findTouchpoints(leadId: string, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(leadId, tenantId);

    return tenantClient.leadTouchpoint.findMany({
      where: { leadId, tenantId },
      orderBy: { fecha: 'desc' },
    });
  }

  async updateTouchpoint(leadId: string, touchpointId: string, dto: UpdateLeadTouchpointDto, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(leadId, tenantId);

    const existing = await tenantClient.leadTouchpoint.findFirst({
      where: { id: touchpointId, leadId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Interacción no encontrada.');
    }

    const data: any = {
      ...(dto.canal && { canal: dto.canal }),
      ...(dto.fecha && { fecha: new Date(dto.fecha) }),
      ...(dto.participanteInterno !== undefined && { participanteInterno: dto.participanteInterno }),
      ...(dto.participanteExterno !== undefined && { participanteExterno: dto.participanteExterno }),
      ...(dto.resumen !== undefined && { resumen: dto.resumen }),
      ...(dto.objeciones !== undefined && { objeciones: dto.objeciones }),
      ...(dto.puntosInteres !== undefined && { puntosInteres: dto.puntosInteres }),
      ...(dto.preferenciasContacto !== undefined && { preferenciasContacto: dto.preferenciasContacto }),
      ...(dto.materialEnviado !== undefined && { materialEnviado: dto.materialEnviado }),
      ...(dto.materialAbierto !== undefined && { materialAbierto: dto.materialAbierto }),
      ...(dto.respuestaMaterial !== undefined && { respuestaMaterial: dto.respuestaMaterial }),
      ...(dto.etapa && { etapa: dto.etapa }),
      ...(dto.compromisosPendientes !== undefined && { compromisosPendientes: dto.compromisosPendientes }),
      ...(dto.fechaRecontacto !== undefined && {
        fechaRecontacto: dto.fechaRecontacto ? new Date(dto.fechaRecontacto) : null,
      }),
    };

    return tenantClient.leadTouchpoint.update({
      where: { id: touchpointId },
      data,
    });
  }

  async removeTouchpoint(leadId: string, touchpointId: string, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(leadId, tenantId);

    const existing = await tenantClient.leadTouchpoint.findFirst({
      where: { id: touchpointId, leadId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Interacción no encontrada.');
    }

    return tenantClient.leadTouchpoint.delete({
      where: { id: touchpointId },
    });
  }
}
