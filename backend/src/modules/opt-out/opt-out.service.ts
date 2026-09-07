import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateOptOutDto } from './dto/opt-out.dto.js';
import { ContactType, ConsentStatus } from '@prisma/client';

@Injectable()
export class OptOutService {
  constructor(private readonly prisma: PrismaService) {}

  async addOptOut(tenantId: string, userId: string, dto: CreateOptOutDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);

    const optOut = await tenantClient.optOut.upsert({
      where: {
        tenantId_contactoId_tipoContacto: {
          tenantId,
          contactoId: dto.contactoId,
          tipoContacto: dto.tipoContacto,
        },
      },
      update: {
        motivo: dto.motivo,
        telefono: dto.telefono,
        fechaExclusion: new Date(),
        creadoPorId: userId,
      },
      create: {
        tenantId,
        contactoId: dto.contactoId,
        tipoContacto: dto.tipoContacto,
        telefono: dto.telefono,
        motivo: dto.motivo,
        creadoPorId: userId,
      },
    });

    // Sincronizar automáticamente con Consent: marcar NO_CONSENTIDO
    await tenantClient.consent.upsert({
      where: {
        tenantId_contactoId_tipoContacto: {
          tenantId,
          contactoId: dto.contactoId,
          tipoContacto: dto.tipoContacto,
        },
      },
      update: {
        estado: ConsentStatus.NO_CONSENTIDO,
        fuenteConsentimiento: 'OptOut: ' + (dto.motivo || 'Solicitud de exclusión'),
        fechaCambio: new Date(),
      },
      create: {
        tenantId,
        contactoId: dto.contactoId,
        tipoContacto: dto.tipoContacto,
        estado: ConsentStatus.NO_CONSENTIDO,
        fuenteConsentimiento: 'OptOut: ' + (dto.motivo || 'Solicitud de exclusión'),
        fechaCambio: new Date(),
      },
    }).catch(() => {});

    // Auditoría
    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'OPTOUT_ADDED',
        details: {
          contactoId: dto.contactoId,
          tipoContacto: dto.tipoContacto,
          motivo: dto.motivo,
        },
      },
    }).catch(() => {});

    return optOut;
  }

  async removeOptOut(tenantId: string, userId: string, contactoId: string, tipoContacto?: ContactType) {
    const tenantClient = this.prisma.getTenantClient(tenantId);

    const where: any = { tenantId, contactoId };
    if (tipoContacto) where.tipoContacto = tipoContacto;

    const existing = await tenantClient.optOut.findFirst({ where });
    if (!existing) {
      throw new NotFoundException(`Contacto ${contactoId} no encontrado en lista de exclusión`);
    }

    await tenantClient.optOut.deleteMany({ where });

    // Auditoría
    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'OPTOUT_REMOVED',
        details: { contactoId, tipoContacto },
      },
    }).catch(() => {});

    return { message: `Contacto ${contactoId} rehabilitado exitosamente` };
  }

  async findAll(tenantId: string, query: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const where: any = { tenantId };

    if (query.tipoContacto) where.tipoContacto = query.tipoContacto;
    if (query.search) {
      where.OR = [
        { contactoId: { contains: query.search, mode: 'insensitive' } },
        { motivo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      tenantClient.optOut.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaExclusion: 'desc' },
        include: {
          creadoPor: { select: { id: true, name: true, email: true } },
        },
      }),
      tenantClient.optOut.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isOptedOut(tenantId: string, contactoId: string, tipoContacto?: ContactType): Promise<boolean> {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const where: any = { tenantId, contactoId };
    if (tipoContacto) where.tipoContacto = tipoContacto;

    const count = await tenantClient.optOut.count({ where });
    return count > 0;
  }
}
