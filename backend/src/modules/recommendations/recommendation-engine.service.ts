import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RecommendationType, Severity, RecommendationStatus, OrderStatus, QuoteStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting scheduled recommendation generation...');
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const tenant of tenants) {
        await this.generateForTenant(tenant.id);
      }
      this.logger.log('Recommendation generation completed successfully.');
    } catch (error) {
      this.logger.error('Error during scheduled recommendation generation:', error);
    }
  }

  async generateForTenant(tenantId: string): Promise<{ generated: number }> {
    let generatedCount = 0;
    this.logger.log(`Generating recommendations for tenant: ${tenantId}`);

    const tenantClient = this.prisma.getTenantClient(tenantId);

    // Helper para crear recomendación si no existe una PENDIENTE o VISTA
    const createIfNotExists = async (
      tipo: RecommendationType,
      titulo: string,
      descripcion: string,
      severidad: Severity,
      entidadRelacionada?: string,
      datos?: any,
    ) => {
      const existing = await tenantClient.recommendation.findFirst({
        where: {
          tenantId,
          tipo,
          entidadRelacionada,
          estado: { in: [RecommendationStatus.PENDIENTE, RecommendationStatus.VISTA] },
        },
      });

      if (!existing) {
        await tenantClient.recommendation.create({
          data: {
            tenantId,
            tipo,
            titulo,
            descripcion,
            severidad,
            entidadRelacionada,
            datos: datos || {},
          },
        });
        generatedCount++;
      }
    };

    // 1. CLIENTE_INACTIVO
    // Clientes sin pedidos entregados en los últimos 60 días
    const hace60Dias = new Date();
    hace60Dias.setDate(hace60Dias.getDate() - 60);
    
    const clientes = await tenantClient.customer.findMany({
      include: {
        orders: {
          where: { estado: OrderStatus.ENTREGADO },
          orderBy: { fecha: 'desc' },
          take: 1
        }
      }
    });

    for (const cliente of clientes) {
      const ultimaCompra = cliente.orders.length > 0 ? cliente.orders[0].fecha : null;
      if (ultimaCompra && ultimaCompra < hace60Dias) {
        // Calcular total comprado para determinar severidad
        const todasLasCompras = await tenantClient.order.findMany({
          where: { clienteId: cliente.id, estado: OrderStatus.ENTREGADO },
          select: { total: true }
        });
        const totalComprado = todasLasCompras.reduce((sum: number, order: any) => sum + Number(order.total), 0);
        
        const severidad = totalComprado > 5000 ? Severity.ALTA : Severity.MEDIA;
        
        await createIfNotExists(
          RecommendationType.CLIENTE_INACTIVO,
          `Cliente inactivo: ${cliente.nombreComercial}`,
          `El cliente no ha realizado compras en los últimos 60 días. Última compra: ${ultimaCompra.toISOString().split('T')[0]}.`,
          severidad,
          `cliente:${cliente.id}`,
          { ultimaCompra, totalComprado }
        );
      }
    }

    // 2. COTIZACION_SIN_RESPUESTA
    // Cotizaciones en estado ENVIADA sin cambios en los últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    const cotizacionesEnviadas = await tenantClient.quote.findMany({
      where: {
        estado: QuoteStatus.ENVIADA,
        updatedAt: { lt: hace7Dias }
      },
      include: { cliente: true }
    });

    for (const cot of cotizacionesEnviadas) {
      await createIfNotExists(
        RecommendationType.COTIZACION_SIN_RESPUESTA,
        `Cotización sin respuesta: ${cot.numero}`,
        `La cotización enviada al cliente ${cot.cliente.nombreComercial} no tiene respuesta desde hace más de 7 días.`,
        Severity.MEDIA,
        `quote:${cot.id}`,
        { numero: cot.numero, cliente: cot.cliente.nombreComercial, monto: Number(cot.total) }
      );
    }

    // 3. PRODUCTO_BAJO_STOCK
    const stocks = await tenantClient.productStock.findMany({
      include: { product: true }
    });

    for (const stock of stocks) {
      const disponible = stock.stockFisico - stock.stockReservado;
      if (disponible <= stock.product.stockMinimo) {
        const severidad = disponible <= 0 ? Severity.ALTA : Severity.MEDIA;
        await createIfNotExists(
          RecommendationType.PRODUCTO_BAJO_STOCK,
          `Bajo stock: ${stock.product.nombre}`,
          `El producto ${stock.product.sku} tiene stock disponible (${disponible}) por debajo del mínimo (${stock.product.stockMinimo}).`,
          severidad,
          `producto:${stock.productId}`,
          { sku: stock.product.sku, disponible, minimo: stock.product.stockMinimo }
        );
      }
    }

    // 4. POTENCIAL_RECOMPRA
    // Clientes con última compra hace > 90 días pero con > 2 pedidos
    const hace90Dias = new Date();
    hace90Dias.setDate(hace90Dias.getDate() - 90);

    for (const cliente of clientes) {
      const ordersTotales = await tenantClient.order.count({
        where: { clienteId: cliente.id, estado: OrderStatus.ENTREGADO }
      });

      if (ordersTotales >= 2) {
        const ultimaCompra = cliente.orders.length > 0 ? cliente.orders[0].fecha : null;
        if (ultimaCompra && ultimaCompra < hace90Dias) {
          await createIfNotExists(
            RecommendationType.POTENCIAL_RECOMPRA,
            `Potencial recompra: ${cliente.nombreComercial}`,
            `Cliente recurrente sin compras en 90 días. Sugerir nueva orden.`,
            Severity.MEDIA,
            `cliente:${cliente.id}`,
            { pedidosTotales: ordersTotales, ultimaCompra }
          );
        }
      }
    }

    // 5. ACTIVIDAD_VENCIDA
    const hoy = new Date();
    const hace3Dias = new Date();
    hace3Dias.setDate(hace3Dias.getDate() - 3);

    const actividadesVencidas = await tenantClient.activity.findMany({
      where: {
        estado: 'PENDIENTE',
        fecha: { lt: hoy }
      }
    });

    for (const act of actividadesVencidas) {
      const severidad = act.fecha < hace3Dias ? Severity.ALTA : Severity.MEDIA;
      await createIfNotExists(
        RecommendationType.ACTIVIDAD_VENCIDA,
        `Actividad vencida: ${act.titulo}`,
        `La actividad programada para el ${act.fecha.toISOString().split('T')[0]} está vencida.`,
        severidad,
        `activity:${act.id}`,
        { fechaVencimiento: act.fecha }
      );
    }

    this.logger.log(`Generated ${generatedCount} new recommendations for tenant: ${tenantId}`);
    return { generated: generatedCount };
  }

  async getActiveRecommendations(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.recommendation.findMany({
      where: {
        tenantId,
        estado: { in: [RecommendationStatus.PENDIENTE, RecommendationStatus.VISTA] }
      },
      orderBy: [
        { severidad: 'asc' },
        { fechaCreacion: 'desc' }
      ]
    });
  }
}
