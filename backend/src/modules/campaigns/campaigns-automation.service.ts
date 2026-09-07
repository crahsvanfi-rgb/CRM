import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CampaignStatus, CampaignTrigger, Priority, CampaignMessageStatus } from '@prisma/client';

@Injectable()
export class CampaignsAutomationService {
  private readonly logger = new Logger(CampaignsAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async evaluateAutomaticCampaigns() {
    this.logger.log('Evaluando campañas automáticas activas...');
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

      for (const tenant of tenants) {
        const tenantClient = this.prisma.getTenantClient(tenant.id);

        const autoCampaigns = await tenantClient.campaign.findMany({
          where: {
            tenantId: tenant.id,
            activaAutomatica: true,
            estado: { in: [CampaignStatus.PROGRAMADA, CampaignStatus.ENVIANDO] }
          },
          include: {
            segmento: true,
            plantilla: true,
            productoObjetivo: true
          }
        });

        for (const campaign of autoCampaigns) {
          switch (campaign.eventoDisparador) {
            case CampaignTrigger.CLIENTE_INACTIVO:
              await this.processInactiveClients(tenantClient, campaign);
              break;
            case CampaignTrigger.NUEVO_PRODUCTO:
              await this.processNewProducts(tenantClient, campaign);
              break;
            case CampaignTrigger.IMPORTACION_RECIBIDA:
              await this.processImportationReceived(tenantClient, campaign);
              break;
            case CampaignTrigger.COTIZACION_SIN_RESPUESTA:
              await this.processUnansweredQuotes(tenantClient, campaign);
              break;
            default:
              break;
          }

          // Registrar última ejecución
          await tenantClient.campaign.update({
            where: { id: campaign.id },
            data: { ultimaEjecucion: new Date() }
          }).catch(() => {});
        }
      }
    } catch (error) {
      this.logger.error('Error evaluando campañas automáticas', error);
    }
  }

  private async processInactiveClients(tenantClient: any, campaign: any) {
    const condiciones = (campaign.segmento?.condiciones as any) || {};
    const diasInactivo = Number(condiciones.diasInactivo) || 90;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - diasInactivo);

    const customers = await tenantClient.customer.findMany({
      where: {
        tenantId: campaign.tenantId,
        estado: 'ACTIVO',
        orders: { some: {} }
      },
      include: {
        orders: {
          select: { id: true, total: true, fecha: true },
          orderBy: { fecha: 'desc' }
        }
      }
    });

    const inactives = customers.filter((c: any) => {
      const lastOrder = c.orders?.[0];
      return lastOrder && new Date(lastOrder.fecha) < dateLimit;
    });

    if (inactives.length === 0) return;

    for (const customer of inactives) {
      const exists = await tenantClient.campaignRecipient.findFirst({
        where: { campaignId: campaign.id, clienteId: customer.id }
      });

      if (!exists) {
        const totalPurchases = customer.orders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0);
        let prioridad: Priority = Priority.BAJA;
        if (totalPurchases >= 5000 || customer.orders.length >= 4) {
          prioridad = Priority.ALTA;
        } else if (totalPurchases >= 1000 || customer.orders.length >= 2) {
          prioridad = Priority.MEDIA;
        }

        const newRecipient = await tenantClient.campaignRecipient.create({
          data: {
            tenantId: campaign.tenantId,
            campaignId: campaign.id,
            clienteId: customer.id,
            prioridad,
            motivo: `Inactividad > ${diasInactivo} días`,
            estado: 'PENDIENTE'
          }
        });

        const templateBody = campaign.plantilla?.cuerpo || campaign.mensajePersonalizado || 'Hola {{nombre}}, tenemos novedades especiales preparadas para ti.';
        const nombreCliente = customer.nombreComercial || customer.razonSocial || 'Cliente';
        const finalContent = templateBody
          .replace(/\{\{nombre\}\}/g, nombreCliente)
          .replace(/\{\{empresa\}\}/g, customer.razonSocial || '')
          .replace(/\{\{telefono\}\}/g, customer.telefono || customer.whatsapp || '');

        await tenantClient.campaignMessage.create({
          data: {
            tenantId: campaign.tenantId,
            campaignId: campaign.id,
            recipientId: newRecipient.id,
            contenido: finalContent,
            estado: CampaignMessageStatus.PENDIENTE
          }
        });

        await tenantClient.campaign.update({
          where: { id: campaign.id },
          data: { totalDestinatarios: { increment: 1 } }
        });
      }
    }
  }

  private async processNewProducts(tenantClient: any, campaign: any) {
    if (!campaign.productoId) return;

    const orderItems = await tenantClient.orderItem.findMany({
      where: {
        tenantId: campaign.tenantId,
        productId: campaign.productoId,
        order: { estado: 'ENTREGADO' }
      },
      select: {
        order: { select: { clienteId: true } }
      }
    });

    const uniqueCustomerIds = Array.from(
      new Set(orderItems.map((oi: any) => oi.order?.clienteId).filter(Boolean))
    ) as string[];

    const productName = campaign.productoObjetivo?.nombre || 'Nuevo Producto';

    for (const customerId of uniqueCustomerIds) {
      const exists = await tenantClient.campaignRecipient.findFirst({
        where: { campaignId: campaign.id, clienteId: customerId }
      });

      if (!exists) {
        const newRecipient = await tenantClient.campaignRecipient.create({
          data: {
            tenantId: campaign.tenantId,
            campaignId: campaign.id,
            clienteId: customerId,
            productoInteresId: campaign.productoId,
            prioridad: Priority.MEDIA,
            motivo: `Comprador de ${productName}`,
            estado: 'PENDIENTE'
          }
        });

        const templateBody = campaign.plantilla?.cuerpo || campaign.mensajePersonalizado || `Hola {{nombre}}, ya tenemos disponible nuevamente ${productName}. ¡Aprovecha precio preferencial!`;
        const customer = await tenantClient.customer.findUnique({ where: { id: customerId } });
        const nombreCliente = customer?.nombreComercial || customer?.razonSocial || 'Cliente';
        const finalContent = templateBody
          .replace(/\{\{nombre\}\}/g, nombreCliente)
          .replace(/\{\{empresa\}\}/g, customer?.razonSocial || '')
          .replace(/\{\{producto\}\}/g, productName);

        await tenantClient.campaignMessage.create({
          data: {
            tenantId: campaign.tenantId,
            campaignId: campaign.id,
            recipientId: newRecipient.id,
            contenido: finalContent,
            estado: CampaignMessageStatus.PENDIENTE
          }
        });

        await tenantClient.campaign.update({
          where: { id: campaign.id },
          data: { totalDestinatarios: { increment: 1 } }
        });
      }
    }
  }

  private async processImportationReceived(tenantClient: any, campaign: any) {
    this.logger.log(`[Disparador IMPORTACION_RECIBIDA] Campaña ${campaign.id} preparada para procesar llegadas de embarques.`);
  }

  private async processUnansweredQuotes(tenantClient: any, campaign: any) {
    this.logger.log(`[Disparador COTIZACION_SIN_RESPUESTA] Campaña ${campaign.id} preparada para seguimiento de cotizaciones vencidas.`);
  }
}
