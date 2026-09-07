import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationEvent, AutomationAction, ExecutionStatus, OrderStatus, QuoteStatus, RecommendationType, Severity, ActivityType, ActivityStatus } from '@prisma/client';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting scheduled automation processing...');
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        await this.processAutomationsForTenant(tenant.id);
      }
      this.logger.log('Automation processing completed successfully.');
    } catch (error) {
      this.logger.error('Error during scheduled automation processing:', error);
    }
  }

  async processAutomationsForTenant(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    // Fetch active automations for the tenant
    const automations = await tenantClient.automation.findMany({
      where: { tenantId, activo: true }
    });

    for (const automation of automations) {
      try {
        await this.executeAutomation(tenantId, automation);
      } catch (err) {
        this.logger.error(`Error executing automation ${automation.id}:`, err);
        // Log the error in Execution table for transparency
        await tenantClient.automationExecution.create({
          data: {
            tenantId,
            automationId: automation.id,
            estado: ExecutionStatus.ERROR,
            errorMensaje: (err as any).message || String(err)
          }
        });
      }
    }
  }

  async executeAutomationManually(tenantId: string, automationId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const automation = await tenantClient.automation.findUnique({
      where: { id: automationId, tenantId }
    });

    if (!automation) {
      throw new Error('Automatización no encontrada');
    }

    await this.executeAutomation(tenantId, automation);
    return { success: true, message: 'Automatización ejecutada manualmente' };
  }

  private async executeAutomation(tenantId: string, automation: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const condiciones = (automation.condiciones as any) || {};

    let targetsToProcess: { entidadRef: string, datosContexto: any }[] = [];

    // EVALUAR EVENTO
    switch (automation.evento) {
      case AutomationEvent.COTIZACION_SIN_RESPUESTA:
        targetsToProcess = await this.evaluateCotizacionSinRespuesta(tenantClient, condiciones);
        break;
      case AutomationEvent.STOCK_BAJO:
        targetsToProcess = await this.evaluateStockBajo(tenantClient, condiciones);
        break;
      case AutomationEvent.PEDIDO_ATRASADO:
        targetsToProcess = await this.evaluatePedidoAtrasado(tenantClient, condiciones);
        break;
      case AutomationEvent.CLIENTE_INACTIVO:
        targetsToProcess = await this.evaluateClienteInactivo(tenantClient, condiciones);
        break;
      case AutomationEvent.ACTIVIDAD_VENCIDA:
        targetsToProcess = await this.evaluateActividadVencida(tenantClient, condiciones);
        break;
      default:
        this.logger.warn(`Evento no soportado: ${automation.evento}`);
        return;
    }

    if (targetsToProcess.length === 0) {
      return; // Nada que procesar
    }

    // PARA CADA TARGET, VERIFICAR IDEMPOTENCIA Y EJECUTAR ACCION
    for (const target of targetsToProcess) {
      // Verificamos si ya corrió exitosamente para esta entidadRef
      const yaEjecutado = await tenantClient.automationExecution.findFirst({
        where: {
          tenantId,
          automationId: automation.id,
          entidadRef: target.entidadRef,
          estado: ExecutionStatus.EXITOSO
        }
      });

      if (yaEjecutado) {
        continue; // Saltamos, ya fue procesada
      }

      try {
        await this.performAction(tenantClient, tenantId, automation.accion, target, automation);
        
        await tenantClient.automationExecution.create({
          data: {
            tenantId,
            automationId: automation.id,
            entidadRef: target.entidadRef,
            estado: ExecutionStatus.EXITOSO,
            resultado: `Acción ${automation.accion} ejecutada correctamente.`
          }
        });
      } catch (err) {
        await tenantClient.automationExecution.create({
          data: {
            tenantId,
            automationId: automation.id,
            entidadRef: target.entidadRef,
            estado: ExecutionStatus.ERROR,
            errorMensaje: (err as any).message
          }
        });
      }
    }
  }

  // --- EVALUADORES DE EVENTOS ---
  
  private async evaluateCotizacionSinRespuesta(tenantClient: any, condiciones: any) {
    const dias = condiciones.dias || 3;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);

    const quotes = await tenantClient.quote.findMany({
      where: {
        estado: QuoteStatus.ENVIADA,
        updatedAt: { lte: fechaLimite }
      },
      include: { cliente: true, vendedor: true }
    });

    return quotes.map((q: any) => ({
      entidadRef: `quote:${q.id}`,
      datosContexto: q
    }));
  }

  private async evaluateStockBajo(tenantClient: any, condiciones: any) {
    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true }
    });

    const targets = [];
    for (const p of products) {
      const stockDisp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      // Validar condicion extra opcional
      if (condiciones.categoriaId && p.categoriaId !== condiciones.categoriaId) continue;
      
      if (stockDisp <= p.stockMinimo) {
        targets.push({
          entidadRef: `product:${p.id}`,
          datosContexto: p
        });
      }
    }
    return targets;
  }

  private async evaluatePedidoAtrasado(tenantClient: any, condiciones: any) {
    const hoy = new Date();
    const orders = await tenantClient.order.findMany({
      where: {
        estado: { in: [OrderStatus.PENDIENTE, OrderStatus.CONFIRMADO] },
        fechaEsperada: { lt: hoy }
      },
      include: { cliente: true, vendedor: true }
    });

    return orders.map((o: any) => ({
      entidadRef: `order:${o.id}`,
      datosContexto: o
    }));
  }

  private async evaluateClienteInactivo(tenantClient: any, condiciones: any) {
    const dias = condiciones.dias || 60;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);

    const clientes = await tenantClient.customer.findMany({
      where: {
        orders: { none: { fecha: { gte: fechaLimite } } }
      }
    });

    return clientes.map((c: any) => ({
      entidadRef: `customer:${c.id}`,
      datosContexto: c
    }));
  }

  private async evaluateActividadVencida(tenantClient: any, condiciones: any) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const activities = await tenantClient.activity.findMany({
      where: {
        estado: ActivityStatus.PENDIENTE,
        fecha: { lt: hoy }
      },
      include: { responsable: true }
    });

    return activities.map((a: any) => ({
      entidadRef: `activity:${a.id}`,
      datosContexto: a
    }));
  }

  // --- EJECUTOR DE ACCIONES ---

  private async performAction(tenantClient: any, tenantId: string, accion: AutomationAction, target: any, automation: any) {
    const conf = (automation.configuracionAccion as any) || {};

    if (accion === AutomationAction.CREAR_ACTIVIDAD) {
      const responsableId = conf.responsableId || target.datosContexto.vendedorId || target.datosContexto.responsableId;
      if (!responsableId) throw new Error('No se pudo determinar un responsable para la actividad');

      let clienteId = null;
      let leadId = null;
      if (target.entidadRef.startsWith('customer:')) clienteId = target.datosContexto.id;
      if (target.entidadRef.startsWith('quote:')) clienteId = target.datosContexto.clienteId;
      if (target.entidadRef.startsWith('order:')) clienteId = target.datosContexto.clienteId;

      await tenantClient.activity.create({
        data: {
          tenantId,
          tipo: conf.tipoActividad || ActivityType.SEGUIMIENTO,
          titulo: conf.titulo || `Seguimiento automático: ${automation.nombre}`,
          descripcion: `Generado por automatización. Entidad ref: ${target.entidadRef}`,
          fecha: new Date(),
          responsableId,
          clienteId,
          leadId
        }
      });
    } 
    else if (accion === AutomationAction.GENERAR_ALERTA) {
      let tipo: any = RecommendationType.POTENCIAL_RECOMPRA;
      if (automation.evento === AutomationEvent.CLIENTE_INACTIVO) tipo = RecommendationType.CLIENTE_INACTIVO;
      if (automation.evento === AutomationEvent.COTIZACION_SIN_RESPUESTA) tipo = RecommendationType.COTIZACION_SIN_RESPUESTA;
      if (automation.evento === AutomationEvent.STOCK_BAJO) tipo = RecommendationType.PRODUCTO_BAJO_STOCK;
      if (automation.evento === AutomationEvent.PEDIDO_ATRASADO) tipo = RecommendationType.PEDIDO_ATRASADO;
      if (automation.evento === AutomationEvent.ACTIVIDAD_VENCIDA) tipo = RecommendationType.ACTIVIDAD_VENCIDA;

      // Buscar para no duplicar alertas activas
      const existing = await tenantClient.recommendation.findFirst({
        where: { tenantId, tipo, entidadRelacionada: target.entidadRef, estado: { in: ['PENDIENTE', 'VISTA'] } }
      });

      if (!existing) {
        await tenantClient.recommendation.create({
          data: {
            tenantId,
            tipo,
            titulo: conf.titulo || `Alerta Automática: ${automation.nombre}`,
            descripcion: conf.descripcion || `Ref: ${target.entidadRef}`,
            severidad: conf.severidad || Severity.MEDIA,
            entidadRelacionada: target.entidadRef
          }
        });
      }
    }
    else if (accion === AutomationAction.ENVIAR_NOTIFICACION) {
      // Por el momento, simplemente registramos en un log interno. 
      // La ejecución de esta rama ya generará un AutomationExecution con estado EXITOSO indicando la notificación.
      this.logger.log(`[NOTIFICACION] ${automation.nombre} - Para: ${target.entidadRef}`);
    }
  }
}
