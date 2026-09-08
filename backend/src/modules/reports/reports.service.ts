import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(query: ReportQueryDto) {
    const where: any = {};
    if (query.fechaInicio) where.gte = new Date(query.fechaInicio);
    if (query.fechaFin) {
      const fin = new Date(query.fechaFin);
      fin.setHours(23, 59, 59, 999);
      where.lte = fin;
    }
    return Object.keys(where).length > 0 ? where : undefined;
  }

  async getSalesByPeriod(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = {
      tenantId,
      estado: 'ENTREGADO',
      activo: true
    };
    if (dateRange) where.createdAt = dateRange;

    const result = await tenantClient.order.aggregate({
      where,
      _sum: { total: true },
      _count: { id: true }
    });

    return {
      totalVentas: result._sum.total || 0,
      cantidadPedidos: result._count.id
    };
  }

  async getSalesByVendor(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = {
      tenantId,
      estado: 'ENTREGADO',
      activo: true
    };
    if (dateRange) where.createdAt = dateRange;

    const grouped = await tenantClient.order.groupBy({
      by: ['vendedorId'],
      where,
      _sum: { total: true },
      _count: { id: true }
    });

    const vendorIds = grouped.map((g: any) => g.vendedorId).filter(Boolean);
    const vendors = await tenantClient.user.findMany({
      where: { tenantId, id: { in: vendorIds } },
      select: { id: true, name: true, email: true }
    });

    return grouped.map((g: any) => {
      const v = vendors.find((user: any) => user.id === g.vendedorId);
      return {
        vendedorId: g.vendedorId,
        nombre: v ? v.name : 'Desconocido',
        totalMonto: g._sum.total || 0,
        cantidadPedidos: g._count.id
      };
    });
  }

  async getSalesByCustomer(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = {
      tenantId,
      estado: 'ENTREGADO',
      activo: true
    };
    if (dateRange) where.createdAt = dateRange;

    const grouped = await tenantClient.order.groupBy({
      by: ['clienteId'],
      where,
      _sum: { total: true },
      _count: { id: true },
      _max: { createdAt: true }
    });

    const customerIds = grouped.map((g: any) => g.clienteId).filter(Boolean);
    const customers = await tenantClient.customer.findMany({
      where: { tenantId, id: { in: customerIds } },
      select: { id: true, nombreComercial: true }
    });

    return grouped.map((g: any) => {
      const c = customers.find((cus: any) => cus.id === g.clienteId);
      return {
        clienteId: g.clienteId,
        nombre: c ? c.nombreComercial : 'Desconocido',
        totalMonto: g._sum.total || 0,
        cantidadPedidos: g._count.id,
        ultimaCompra: g._max.createdAt
      };
    });
  }

  async getTopProducts(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    const limit = query.limit ? parseInt(query.limit as any, 10) : 10;
    
    const whereOrder: any = { tenantId, estado: 'ENTREGADO', activo: true };
    if (dateRange) whereOrder.createdAt = dateRange;

    const orders = await tenantClient.order.findMany({
      where: whereOrder,
      select: { id: true }
    });
    const orderIds = orders.map((o: any) => o.id);

    if (orderIds.length === 0) return [];

    const grouped = await tenantClient.orderItem.groupBy({
      by: ['productId'],
      where: { tenantId, orderId: { in: orderIds } },
      _sum: { cantidad: true, total: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: limit
    });

    const productIds = grouped.map((g: any) => g.productId);
    const products = await tenantClient.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, nombre: true, sku: true }
    });

    return grouped.map((g: any) => {
      const p = products.find((prod: any) => prod.id === g.productId);
      return {
        productId: g.productId,
        sku: p ? p.sku : '',
        nombre: p ? p.nombre : 'Desconocido',
        cantidadTotal: g._sum.cantidad || 0,
        montoTotal: g._sum.total || 0
      };
    });
  }

  async getLeastProducts(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    const limit = query.limit ? parseInt(query.limit as any, 10) : 10;
    
    const whereOrder: any = { tenantId, estado: 'ENTREGADO', activo: true };
    if (dateRange) whereOrder.createdAt = dateRange;

    const orders = await tenantClient.order.findMany({
      where: whereOrder,
      select: { id: true }
    });
    const orderIds = orders.map((o: any) => o.id);

    if (orderIds.length === 0) return [];

    const grouped = await tenantClient.orderItem.groupBy({
      by: ['productId'],
      where: { tenantId, orderId: { in: orderIds } },
      _sum: { cantidad: true, total: true },
      orderBy: { _sum: { cantidad: 'asc' } },
      take: limit
    });

    const productIds = grouped.map((g: any) => g.productId);
    const products = await tenantClient.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, nombre: true, sku: true }
    });

    return grouped.map((g: any) => {
      const p = products.find((prod: any) => prod.id === g.productId);
      return {
        productId: g.productId,
        sku: p ? p.sku : '',
        nombre: p ? p.nombre : 'Desconocido',
        cantidadTotal: g._sum.cantidad || 0,
        montoTotal: g._sum.total || 0
      };
    });
  }

  async getStockSummary(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const stocks = await tenantClient.productStock.findMany({
      where: { tenantId },
      include: {
        product: {
          select: { nombre: true, sku: true, stockMinimo: true }
        }
      }
    });

    return stocks.map((s: any) => {
      const disponible = s.stockFisico - s.stockReservado;
      return {
        productId: s.productId,
        sku: s.product.sku,
        nombre: s.product.nombre,
        stockFisico: s.stockFisico,
        stockReservado: s.stockReservado,
        stockDisponible: disponible,
        stockTransito: s.stockTransito,
        stockMinimo: s.product.stockMinimo,
        alerta: disponible <= s.product.stockMinimo
      };
    });
  }

  async getLeadsReport(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = { tenantId, activo: true };
    if (dateRange) where.createdAt = dateRange;

    const [total, byStatus, bySource] = await Promise.all([
      tenantClient.lead.count({ where }),
      tenantClient.lead.groupBy({ by: ['estado'], where, _count: { id: true } }),
      tenantClient.lead.groupBy({ by: ['fuente'], where, _count: { id: true } })
    ]);

    return {
      total,
      porEstado: byStatus.map((s: any) => ({ estado: s.estado, count: s._count.id })),
      porFuente: bySource.map((s: any) => ({ fuente: s.fuente || 'Sin fuente', count: s._count.id }))
    };
  }

  async getLeadConversion(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = { tenantId, activo: true };
    if (dateRange) where.createdAt = dateRange;

    const totalLeads = await tenantClient.lead.count({ where });
    const convertedLeads = await tenantClient.lead.count({
      where: { ...where, customer: { isNot: null } }
    });

    return {
      totalLeads,
      convertedLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    };
  }

  async getNewCustomers(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = { tenantId, estado: 'ACTIVO' };
    if (dateRange) where.createdAt = dateRange;

    const customers = await tenantClient.customer.findMany({
      where,
      select: {
        id: true,
        nombreComercial: true,
        createdAt: true,
        vendedor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return customers.map((c: any) => ({
      id: c.id,
      nombre: c.nombreComercial,
      fechaCreacion: c.createdAt,
      vendedor: c.vendedor ? c.vendedor.name : 'Sin vendedor'
    }));
  }

  async getInactiveCustomers(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dias = query.diasInactivo ? parseInt(query.diasInactivo as any, 10) : 90;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dias);

    const customers = await tenantClient.customer.findMany({
      where: {
        tenantId,
        estado: 'ACTIVO',
        orders: {
          none: {
            estado: 'ENTREGADO',
            createdAt: { gte: cutoffDate }
          }
        }
      },
      select: {
        id: true,
        nombreComercial: true,
        orders: {
          where: { estado: 'ENTREGADO' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    return customers.map((c: any) => ({
      id: c.id,
      nombre: c.nombreComercial,
      ultimaCompra: c.orders.length > 0 ? c.orders[0].createdAt : null
    }));
  }

  async getImportationsReport(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    
    const where: any = { tenantId, activo: true };
    if (dateRange) where.createdAt = dateRange;

    const importations = await tenantClient.importation.findMany({
      where,
      include: {
        proveedor: { select: { nombre: true } },
        items: { select: { cantidad: true, total: true } }
      }
    });

    return importations.map((imp: any) => {
      const cantidadTotal = imp.items.reduce((acc: number, item: any) => acc + item.cantidad, 0);
      const costoTotal = imp.items.reduce((acc: number, item: any) => acc + Number(item.total), 0);
      return {
        id: imp.id,
        codigo: imp.codigo,
        proveedor: imp.proveedor?.nombre || 'Desconocido',
        estado: imp.estado,
        fechaCompra: imp.fechaCompra,
        cantidadProductos: cantidadTotal,
        costoTotal
      };
    });
  }

  async getLeadFunnel(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    const where: any = { tenantId, activo: true };
    if (dateRange) where.createdAt = dateRange;
    const grouped = await tenantClient.lead.groupBy({ by: ['etapaVenta'], where, _count: { id: true }, _sum: { montoEstimado: true } });
    return grouped.map((g: any) => ({ etapa: g.etapaVenta || 'PROSPECTO_NUEVO', cantidad: g._count.id, montoEstimado: Number(g._sum.montoEstimado || 0) }));
  }

  async getLeadForecast(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    const where: any = { tenantId, activo: true, etapaVenta: { in: ['CLIENTE_CALIFICADO', 'COTIZACION_ENVIADA', 'NEGOCIACION'] } };
    if (dateRange) where.createdAt = dateRange;
    const leads = await tenantClient.lead.findMany({ where, select: { id: true, leadId: true, name: true, companyName: true, etapaVenta: true, montoEstimado: true, vendedor: { select: { name: true, email: true } } }, orderBy: { updatedAt: 'desc' }, take: 100 });
    const total = leads.reduce((acc: number, l: any) => acc + Number(l.montoEstimado || 0), 0);
    return { totalPronosticado: total, oportunidades: leads.map((l: any) => ({ ...l, montoEstimado: Number(l.montoEstimado || 0) })) };
  }

  async getLeadLossReasons(tenantId: string, query: ReportQueryDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateRange = this.getDateRange(query);
    const where: any = { tenantId, activo: true, OR: [{ etapaVenta: 'CIERRE_PERDIDO' }, { estado: 'PERDIDO' }] };
    if (dateRange) where.createdAt = dateRange;
    const grouped = await tenantClient.lead.groupBy({ by: ['motivoPerdida'], where, _count: { id: true } });
    return grouped.map((g: any) => ({ motivo: g.motivoPerdida || 'Sin motivo', cantidad: g._count.id }));
  }

}
