import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpsertCampaignConfigDto } from './dto/campaign-config.dto.js';

@Injectable()
export class CampaignConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private checkAdminOrGerente(userRole: any) {
    const roleName = typeof userRole === 'string' ? userRole.toLowerCase() : userRole?.name?.toLowerCase();
    if (roleName !== 'admin' && roleName !== 'gerente') {
      throw new ForbiddenException('Solo administradores y gerentes pueden modificar la configuración de campañas.');
    }
  }

  async getConfig(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    let config = await tenantClient.campaignConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      config = await tenantClient.campaignConfig.create({
        data: {
          tenantId,
          campanasActivas: true,
          intervaloEntreEnviosMs: 1000,
          aprobacionObligatoria: true,
          permiteAutomatizaciones: true,
          iaHabilitada: false,
        },
      });
    }

    return config;
  }

  async upsertConfig(tenantId: string, userId: string, userRole: any, dto: UpsertCampaignConfigDto) {
    this.checkAdminOrGerente(userRole);
    const tenantClient = this.prisma.getTenantClient(tenantId);

    const config = await tenantClient.campaignConfig.upsert({
      where: { tenantId },
      update: {
        ...dto,
      },
      create: {
        tenantId,
        campanasActivas: dto.campanasActivas ?? true,
        zeniorConfigurado: dto.zeniorConfigurado ?? false,
        limiteMensajesPorHora: dto.limiteMensajesPorHora,
        intervaloEntreEnviosMs: dto.intervaloEntreEnviosMs ?? 1000,
        horarioPermitidoInicio: dto.horarioPermitidoInicio,
        horarioPermitidoFin: dto.horarioPermitidoFin,
        firma: dto.firma,
        mensajePredeterminado: dto.mensajePredeterminado,
        aprobacionObligatoria: dto.aprobacionObligatoria ?? true,
        permiteAutomatizaciones: dto.permiteAutomatizaciones ?? true,
        iaHabilitada: dto.iaHabilitada ?? false,
      },
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CAMPAIGN_CONFIG_UPDATED',
        details: { ...dto },
      },
    }).catch(() => {});

    return config;
  }

  async toggleCampanas(tenantId: string, userId: string, userRole: any, active?: boolean) {
    this.checkAdminOrGerente(userRole);
    const current = await this.getConfig(tenantId);
    const newStatus = typeof active === 'boolean' ? active : !current.campanasActivas;

    const tenantClient = this.prisma.getTenantClient(tenantId);
    const updated = await tenantClient.campaignConfig.update({
      where: { tenantId },
      data: { campanasActivas: newStatus },
    });

    await tenantClient.auditLog.create({
      data: {
        tenantId,
        userId,
        action: newStatus ? 'CAMPAIGNS_ENABLED' : 'CAMPAIGNS_DISABLED',
        details: { campanasActivas: newStatus },
      },
    }).catch(() => {});

    return updated;
  }
}
