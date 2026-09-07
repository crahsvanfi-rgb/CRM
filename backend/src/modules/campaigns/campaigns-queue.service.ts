import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZeniorWebhookService } from '../zenior/zenior-webhook.service.js';
import { CampaignMessageStatus, CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsQueueService {
  private readonly logger = new Logger(CampaignsQueueService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly zeniorService: ZeniorWebhookService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Obtener todas las campañas que están en estado ENVIANDO
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

      for (const tenant of tenants) {
        const tenantClient = this.prisma.getTenantClient(tenant.id);

        const tenantConfig = await tenantClient.campaignConfig.findUnique({
          where: { tenantId: tenant.id }
        });

        if (tenantConfig && tenantConfig.campanasActivas === false) {
          continue;
        }

        // Validar horario permitido
        if (tenantConfig?.horarioPermitidoInicio && tenantConfig?.horarioPermitidoFin) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          if (currentFormatted < tenantConfig.horarioPermitidoInicio || currentFormatted > tenantConfig.horarioPermitidoFin) {
            this.logger.log(`Tenant ${tenant.id} fuera del horario de envío permitido (${tenantConfig.horarioPermitidoInicio} - ${tenantConfig.horarioPermitidoFin}).`);
            continue;
          }
        }
        
        const activeCampaigns = await tenantClient.campaign.findMany({
          where: { estado: CampaignStatus.ENVIANDO, tenantId: tenant.id }
        });

        for (const campaign of activeCampaigns) {
          
          // Leer config
          const maxPorLote = campaign.concurrencia || 5;
          const limiteHora = campaign.limiteMensajesPorHora;
          const pausaMs = campaign.intervaloEntreEnviosMs || 1000;
          const maxReintentos = campaign.maxReintentos || 3;

          if (campaign.pausada) continue;

          // Validar limite por hora
          if (limiteHora) {
            const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
            const enviadosUltimaHora = await tenantClient.campaignMessage.count({
              where: {
                campaignId: campaign.id,
                fechaEnvio: { gte: unaHoraAtras }
              }
            });
            if (enviadosUltimaHora >= limiteHora) {
              this.logger.log(`Campaña ${campaign.id} alcanzó límite por hora (${enviadosUltimaHora}/${limiteHora}).`);
              continue;
            }
          }

          // Buscar mensajes pendientes para esta campaña
          const mensajes = await tenantClient.campaignMessage.findMany({
            where: {
              tenantId: tenant.id,
              campaignId: campaign.id,
              estado: CampaignMessageStatus.PENDIENTE
            },
            take: maxPorLote,
            include: {
              recipient: {
                include: { cliente: true, lead: true }
              }
            }
          });

          if (mensajes.length === 0) {
            // Verificar si quedan fallidos por procesar
            const fallidos = await tenantClient.campaignMessage.count({
              where: {
                tenantId: tenant.id,
                campaignId: campaign.id,
                estado: CampaignMessageStatus.FALLIDO
              }
            });
            const procesando = await tenantClient.campaignMessage.count({
              where: {
                tenantId: tenant.id,
                campaignId: campaign.id,
                estado: CampaignMessageStatus.PROCESANDO
              }
            });

            if (fallidos === 0 && procesando === 0) {
              // Si no hay pendientes, ni fallidos ni procesando, marcar como COMPLETADA
              await tenantClient.campaign.update({
                where: { id: campaign.id, tenantId: tenant.id },
                data: { estado: CampaignStatus.COMPLETADA }
              });
              this.logger.log(`Campaña ${campaign.id} completada.`);
            }
            continue; // Pasar a la siguiente campaña
          }

          // Marcar lote como PROCESANDO
          const ids = mensajes.map((m: any) => m.id);
          await tenantClient.campaignMessage.updateMany({
            where: { id: { in: ids }, tenantId: tenant.id },
            data: { estado: CampaignMessageStatus.PROCESANDO }
          });

          // Concurrencia
          const sendPromises = mensajes.map(async (msg: any, index: number) => {
            // Intervalo entre envios (sencillo delay incremental dentro del batch)
            if (pausaMs > 0 && index > 0) {
              await new Promise(resolve => setTimeout(resolve, pausaMs * index));
            }
            
            try {
              const contact = msg.recipient.cliente || msg.recipient.lead;
              if (!contact || !contact.telefono) {
                throw new Error('Destinatario sin teléfono');
              }
              const phone = contact.telefono;
              const contactId = msg.recipient.clienteId || msg.recipient.leadId;

              // Verificar si el contacto está en lista de exclusión (OptOut)
              const isOptedOut = await tenantClient.optOut.findFirst({
                where: {
                  tenantId: tenant.id,
                  OR: [
                    ...(contactId ? [{ contactoId: contactId }] : []),
                    ...(phone ? [{ telefono: phone }] : [])
                  ]
                }
              });

              if (isOptedOut) {
                await tenantClient.campaignMessage.update({
                  where: { id: msg.id, tenantId: tenant.id },
                  data: {
                    estado: CampaignMessageStatus.FALLIDO,
                    errorMensaje: 'Contacto en lista de exclusión (OptOut)',
                    fechaFallido: new Date()
                  }
                });
                await tenantClient.campaign.update({
                  where: { id: campaign.id },
                  data: { totalFallidos: { increment: 1 } }
                });
                return;
              }

              // Llamar a Zenior
              const zeniorResponse = await this.zeniorService.sendProactiveMessage(
                tenant.id,
                campaign.canal, // WHATSAPP
                phone,
                msg.contenido
              );


              // Marcar como enviado
              await tenantClient.campaignMessage.update({
                where: { id: msg.id, tenantId: tenant.id },
                data: { 
                  estado: CampaignMessageStatus.ENVIADO,
                  externalId: zeniorResponse?.externalId || 'mock-id',
                  fechaEnvio: new Date()
                }
              });

              // Update stats
              await tenantClient.campaign.update({
                where: { id: campaign.id },
                data: { totalEnviados: { increment: 1 } }
              });

            } catch (err: any) {
              this.logger.error(`Error enviando mensaje ${msg.id}: ${err.message}`);
              const failedState = msg.intentos >= (maxReintentos - 1) ? CampaignMessageStatus.FALLIDO : CampaignMessageStatus.PENDIENTE;
              
              await tenantClient.campaignMessage.update({
                where: { id: msg.id, tenantId: tenant.id },
                data: {
                  estado: failedState,
                  errorMensaje: err.message,
                  intentos: { increment: 1 },
                  fechaFallido: failedState === 'FALLIDO' ? new Date() : undefined
                }
              });

              if (failedState === 'FALLIDO') {
                await tenantClient.campaign.update({
                  where: { id: campaign.id },
                  data: { totalFallidos: { increment: 1 } }
                });
              }
            }
          });

          await Promise.all(sendPromises);

        }
      }
    } catch (error) {
      this.logger.error('Error procesando cola de campañas', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
