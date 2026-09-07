import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterConsentDto } from './dto/consent.dto.js';
import { ContactType, ConsentStatus } from '@prisma/client';

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async registerConsent(tenantId: string, userId: string, dto: RegisterConsentDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const fechaConsentimiento = dto.estado === ConsentStatus.CONSENTIDO ? new Date() : null;

    const consent = await tenantClient.consent.upsert({
      where: {
        tenantId_contactoId_tipoContacto: {
          tenantId,
          contactoId: dto.contactoId,
          tipoContacto: dto.tipoContacto,
        },
      },
      update: {
        estado: dto.estado,
        canal: dto.canal,
        origen: dto.origen,
        ipOrigen: dto.ipOrigen,
        observaciones: dto.observaciones,
        fuenteConsentimiento: dto.fuenteConsentimiento,
        fechaConsentimiento: fechaConsentimiento || undefined,
        fechaCambio: new Date(),
        customerId: dto.customerId,
        leadId: dto.leadId,
      },
      create: {
        tenantId,
        contactoId: dto.contactoId,
        tipoContacto: dto.tipoContacto,
        estado: dto.estado,
        canal: dto.canal,
        origen: dto.origen,
        ipOrigen: dto.ipOrigen,
        observaciones: dto.observaciones,
        fuenteConsentimiento: dto.fuenteConsentimiento,
        fechaConsentimiento,
        fechaCambio: new Date(),
        customerId: dto.customerId,
        leadId: dto.leadId,
      },
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CONSENT_UPDATED',
        details: {
          contactoId: dto.contactoId,
          tipoContacto: dto.tipoContacto,
          estado: dto.estado,
          fuente: dto.fuenteConsentimiento,
        },
      },
    }).catch(() => {});

    return consent;
  }

  async getConsentStatus(tenantId: string, contactoId: string, tipoContacto?: ContactType) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const where: any = { tenantId, contactoId };
    if (tipoContacto) where.tipoContacto = tipoContacto;

    const consent = await tenantClient.consent.findFirst({
      where,
      orderBy: { fechaCambio: 'desc' },
    });

    if (!consent) {
      return {
        contactoId,
        tipoContacto: tipoContacto || ContactType.EXTERNO,
        estado: ConsentStatus.PENDIENTE,
        hasConsent: false,
        existeRegistro: false,
      };
    }

    return {
      ...consent,
      hasConsent: consent.estado === ConsentStatus.CONSENTIDO,
      existeRegistro: true,
    };
  }

  async hasValidConsent(tenantId: string, contactoId: string, tipoContacto?: ContactType): Promise<boolean> {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const where: any = { tenantId, contactoId };
    if (tipoContacto) where.tipoContacto = tipoContacto;

    const consent = await tenantClient.consent.findFirst({
      where,
      orderBy: { fechaCambio: 'desc' },
    });

    // Si existe registro y es CONSENTIDO, es válido
    if (consent) {
      return consent.estado === ConsentStatus.CONSENTIDO;
    }

    // Si no existe registro explícito, por defecto para campañas de marketing en MVP se considera PENDIENTE (no consentido)
    return false;
  }
}
