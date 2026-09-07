import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AiToolsService {
  constructor(private readonly prisma: PrismaService) {}

  // Definición de las herramientas para enviar a OpenRouter
  getToolsDefinition() {
    return [
      {
        type: 'function',
        function: {
          name: 'getCustomerInformation',
          description: 'Obtiene datos básicos de un cliente, su total comprado y última compra.',
          parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getInactiveCustomers',
          description: 'Obtiene clientes sin pedidos recientes (inactivos).',
          parameters: { type: 'object', properties: { dias: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getPendingOrders',
          description: 'Obtiene pedidos que están en estado PENDIENTE o CONFIRMADO.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getImportations',
          description: 'Obtiene importaciones. Requiere rol de Admin o Gerente.',
          parameters: { type: 'object', properties: { estado: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getQuotes',
          description: 'Obtiene cotizaciones filtradas opcionalmente por estado.',
          parameters: { type: 'object', properties: { estado: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getActivities',
          description: 'Obtiene actividades pendientes o completadas.',
          parameters: { type: 'object', properties: { estado: { type: 'string' } } },
        },
      },
      // --- FASE 3.3: NUEVAS HERRAMIENTAS DE CLIENTES ---
      {
        type: 'function',
        function: {
          name: 'searchCustomerByName',
          description: 'Busca clientes por su nombre comercial o razón social.',
          parameters: { type: 'object', properties: { nombre: { type: 'string' } }, required: ['nombre'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'searchCustomerByNIT',
          description: 'Busca un cliente por su NIT exacto.',
          parameters: { type: 'object', properties: { nit: { type: 'string' } }, required: ['nit'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCustomerSalesInfo',
          description: 'Obtiene el total comprado acumulado, fecha de última compra y cantidad de pedidos de un cliente. Requiere Admin/Gerente si es monto total.',
          parameters: { type: 'object', properties: { clienteId: { type: 'string' } }, required: ['clienteId'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCustomerQuotes',
          description: 'Obtiene las cotizaciones de un cliente.',
          parameters: { type: 'object', properties: { clienteId: { type: 'string' } }, required: ['clienteId'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCustomerOrders',
          description: 'Obtiene los pedidos de un cliente.',
          parameters: { type: 'object', properties: { clienteId: { type: 'string' } }, required: ['clienteId'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCustomerActivities',
          description: 'Obtiene actividades relacionadas con el cliente (pendientes o completadas).',
          parameters: { type: 'object', properties: { clienteId: { type: 'string' } }, required: ['clienteId'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCustomerSummary',
          description: 'Obtiene un resumen estructurado 360 de un cliente (datos, ventas, cotizaciones, actividades) y da una recomendación.',
          parameters: { type: 'object', properties: { clienteId: { type: 'string' } }, required: ['clienteId'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'detectFrequentCustomers',
          description: 'Devuelve clientes con mayor número de pedidos (mayor rotación). Requiere rol de Admin o Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'detectHighValueCustomers',
          description: 'Devuelve clientes VIP con mayor monto comprado total. Requiere rol de Admin o Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'recommendFollowUpCustomers',
          description: 'Devuelve clientes que requieren seguimiento según reglas (cotizaciones vencidas, inactivos de alto valor, etc).',
          parameters: { type: 'object', properties: {} },
        },
      },
      // --- FASE 3.4: INTELIGENCIA DE INVENTARIO ---
      {
        type: 'function',
        function: {
          name: 'getInventorySummary',
          description: 'Devuelve resumen general: total de productos, stock físico total, stock reservado, disponible y tránsito. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getStockByProduct',
          description: 'Devuelve stock físico, reservado, disponible y en tránsito de un producto específico (SKU o Nombre).',
          parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getLowStockProducts',
          description: 'Lista productos con stock disponible <= stock mínimo.',
          parameters: { type: 'object', properties: { limit: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getOutOfStockProducts',
          description: 'Productos con stock disponible igual a 0.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getProductsInTransit',
          description: 'Productos asociados a importaciones en estado EN_TRANSITO o ADUANA, con cantidad en tránsito. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getHighRotationProducts',
          description: 'Productos con mayor cantidad vendida en un periodo. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' }, limit: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getLowRotationProducts',
          description: 'Productos con menor rotación o sin ventas. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' }, limit: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'compareSalesVsInventory',
          description: 'Compara ventas (pedidos entregados) contra stock disponible actual para cada producto. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'recommendReorderProducts',
          description: 'Analiza ventas, stock y tránsito para recomendar productos que deberían reimportarse urgente. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getStockRiskProducts',
          description: 'Detecta productos en riesgo: stock disponible <= 20% del stock mínimo. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      // --- FASE 3.5: ANÁLISIS INTELIGENTE DE VENTAS ---
      {
        type: 'function',
        function: {
          name: 'getSalesSummary',
          description: 'Devuelve total facturado, número de pedidos, ticket promedio y comparación con el período anterior. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string', description: 'hoy, semana, mes, año, o YYYY-MM-DD' } }, required: ['periodo'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getSalesByPeriod',
          description: 'Ventas totales y cantidad de pedidos en un rango de fechas. Compara con período anterior. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodoInicio: { type: 'string', description: 'YYYY-MM-DD' }, periodoFin: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['periodoInicio', 'periodoFin'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getSalesByVendor',
          description: 'Ventas agrupadas por vendedor: monto total, pedidos, ticket promedio. Vendedores solo ven lo suyo.',
          parameters: { type: 'object', properties: { periodo: { type: 'string', description: 'hoy, semana, mes, año' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getSalesByCustomer',
          description: 'Ventas agrupadas por cliente: monto total, pedidos, última compra. Vendedores solo ven a sus clientes.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getSalesByProduct',
          description: 'Ventas por producto: cantidad vendida y monto total. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getTopProducts',
          description: 'Productos más vendidos (cantidad y monto). Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' }, limit: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getLeastProducts',
          description: 'Productos menos vendidos o sin ventas. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' }, limit: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getTopCustomers',
          description: 'Clientes principales por monto comprado. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' }, limit: { type: 'number' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getAverageTicket',
          description: 'Ticket promedio general y por vendedor/cliente. Vendedores solo ven lo suyo.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getSalesTrend',
          description: 'Serie temporal de ventas para detectar tendencia (creciente/decreciente/estable). Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string', description: 'ej: 6m, 12m' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getQuoteConversion',
          description: 'Tasa de conversión de cotizaciones a pedidos. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCommercialRecommendations',
          description: 'Recomendaciones accionables (clientes inactivos, rotación, cotizaciones). Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: { periodo: { type: 'string' } } },
        },
      },
      // --- FASE 3.6: MOTOR DE RECOMENDACIONES ---
      {
        type: 'function',
        function: {
          name: 'getActiveRecommendations',
          description: 'Consulta el motor de recomendaciones para obtener alertas activas sobre clientes inactivos, cotizaciones vencidas, productos sin stock, pedidos atrasados, etc. Útil cuando el usuario pregunta "¿Qué debo atender hoy?". Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      // --- FASE 3.7: AUTOMATIZACIONES ---
      {
        type: 'function',
        function: {
          name: 'listAutomations',
          description: 'Lista las automatizaciones configuradas (activas e inactivas) del tenant y sus últimas ejecuciones. Útil para consultar las reglas de negocio automáticas. Requiere Admin/Gerente.',
          parameters: { type: 'object', properties: {} },
        },
      },
      // --- FASE 4.29: ANÁLISIS DE MARKETING Y CAMPAÑAS ---
      {
        type: 'function',
        function: {
          name: 'getCampaignPerformance',
          description: 'Obtiene métricas y estadísticas de rendimiento de campañas de marketing (destinatarios, enviados, entregados, respuestas, leads generados, conversiones y costos). Vendedores solo ven sus campañas.',
          parameters: {
            type: 'object',
            properties: {
              estado: { type: 'string', description: 'Opcional: BORRADOR, PROGRAMADA, ENVIANDO, COMPLETADA, etc.' },
              canal: { type: 'string', description: 'Opcional: WHATSAPP, EMAIL, SMS' }
            }
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getBestCampaign',
          description: 'Determina cuál fue la campaña más efectiva o con mejor rendimiento (por tasa de respuesta o por leads generados), argumentando el motivo y recomendando si repetirla.',
          parameters: {
            type: 'object',
            properties: {
              criterio: { type: 'string', description: 'Opcional: "tasa_respuesta" o "leads_generados"' }
            }
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getUnresponsiveCustomers',
          description: 'Obtiene los clientes que recibieron mensajes de campaña pero nunca respondieron, indicando nombre, teléfono y campaña para facilitar seguimiento o recontacto.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Límite de contactos a retornar (por defecto 20)' }
            }
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getLeadHistory',
          description: 'Obtiene el historial de seguimiento comercial, touchpoints, objeciones, puntos de interés y memoria de un lead específico.',
          parameters: {
            type: 'object',
            properties: {
              leadId: { type: 'string', description: 'ID o código del lead (ej. LEAD-001 o UUID) o nombre/teléfono para buscarlo' }
            },
            required: ['leadId']
          }
        }
      }
    ];
  }

  // Ejecutador central
  async executeTool(name: string, args: any, tenantId: string, roleName: string, userId: string) {
    switch (name) {
      case 'getSalesSummary': return this.getSalesSummary(tenantId, roleName, args.periodo);
      case 'getCustomerInformation': return this.getCustomerInformation(tenantId, args.query, roleName, userId);
      case 'getInactiveCustomers': return this.getInactiveCustomers(tenantId, args.dias);
      case 'getPendingOrders': return this.getPendingOrders(tenantId);
      case 'getImportations': return this.getImportations(tenantId, roleName, args.estado);
      case 'getQuotes': return this.getQuotes(tenantId, args.estado);
      case 'getActivities': return this.getActivities(tenantId, args.estado);
      // FASE 3.3
      case 'searchCustomerByName': return this.searchCustomerByName(tenantId, args.nombre, roleName, userId);
      case 'searchCustomerByNIT': return this.searchCustomerByNIT(tenantId, args.nit, roleName, userId);
      case 'getCustomerSalesInfo': return this.getCustomerSalesInfo(tenantId, roleName, args.clienteId);
      case 'getCustomerQuotes': return this.getCustomerQuotes(tenantId, args.clienteId);
      case 'getCustomerOrders': return this.getCustomerOrders(tenantId, args.clienteId);
      case 'getCustomerActivities': return this.getCustomerActivities(tenantId, args.clienteId);
      case 'getCustomerSummary': return this.getCustomerSummary(tenantId, roleName, args.clienteId);
      case 'detectFrequentCustomers': return this.detectFrequentCustomers(tenantId, roleName);
      case 'detectHighValueCustomers': return this.detectHighValueCustomers(tenantId, roleName);
      case 'recommendFollowUpCustomers': return this.recommendFollowUpCustomers(tenantId);
      // FASE 3.4
      case 'getInventorySummary': return this.getInventorySummary(tenantId, roleName);
      case 'getStockByProduct': return this.getStockByProduct(tenantId, args.query);
      case 'getLowStockProducts': return this.getLowStockProducts(tenantId, args.limit);
      case 'getOutOfStockProducts': return this.getOutOfStockProducts(tenantId);
      case 'getProductsInTransit': return this.getProductsInTransit(tenantId, roleName);
      case 'getHighRotationProducts': return this.getHighRotationProducts(tenantId, roleName, args.periodo, args.limit);
      case 'getLowRotationProducts': return this.getLowRotationProducts(tenantId, roleName, args.periodo, args.limit);
      case 'compareSalesVsInventory': return this.compareSalesVsInventory(tenantId, roleName);
      case 'recommendReorderProducts': return this.recommendReorderProducts(tenantId, roleName);
      case 'getStockRiskProducts': return this.getStockRiskProducts(tenantId, roleName);
      // FASE 3.5
      case 'getSalesByPeriod': return this.getSalesByPeriod(tenantId, roleName, args.periodoInicio, args.periodoFin);
      case 'getSalesByVendor': return this.getSalesByVendor(tenantId, roleName, userId, args.periodo);
      case 'getSalesByCustomer': return this.getSalesByCustomer(tenantId, roleName, userId, args.periodo);
      case 'getSalesByProduct': return this.getSalesByProduct(tenantId, roleName, args.periodo);
      case 'getTopProducts': return this.getTopProducts(tenantId, roleName, args.periodo, args.limit);
      case 'getLeastProducts': return this.getLeastProducts(tenantId, roleName, args.periodo, args.limit);
      case 'getTopCustomers': return this.getTopCustomers(tenantId, roleName, args.periodo, args.limit);
      case 'getAverageTicket': return this.getAverageTicket(tenantId, roleName, userId, args.periodo);
      case 'getSalesTrend': return this.getSalesTrend(tenantId, roleName, args.periodo);
      case 'getQuoteConversion': return this.getQuoteConversion(tenantId, roleName, args.periodo);
      case 'getCommercialRecommendations': return this.getCommercialRecommendations(tenantId, roleName);
      // FASE 3.6
      case 'getActiveRecommendations': return this.getActiveRecommendations(tenantId, roleName);
      // FASE 3.7
      case 'listAutomations': return (this as any).listAutomations(tenantId, roleName);
      // FASE 4.29: MARKETING
      case 'getCampaignPerformance': return this.getCampaignPerformance(tenantId, roleName, userId, args);
      case 'getBestCampaign': return this.getBestCampaign(tenantId, roleName, userId, args?.criterio);
      case 'getUnresponsiveCustomers': return this.getUnresponsiveCustomers(tenantId, roleName, userId, args?.limit);
      case 'getLeadHistory': return this.getLeadHistory(tenantId, args?.leadId);
      default:
        throw new Error(`Herramienta no implementada: ${name}`);
    }
  }

  // --- Herramienta de Historial de Leads ---

  async getLeadHistory(tenantId: string, leadIdOrSearch: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    if (!leadIdOrSearch) return { error: 'Se requiere un identificador o nombre de lead.' };

    const lead = await tenantClient.lead.findFirst({
      where: {
        tenantId,
        activo: true,
        OR: [
          { id: leadIdOrSearch },
          { leadId: { equals: leadIdOrSearch, mode: 'insensitive' } },
          { name: { contains: leadIdOrSearch, mode: 'insensitive' } },
          { phone: { contains: leadIdOrSearch } },
        ],
      },
      include: {
        vendedor: { select: { name: true, email: true } },
        touchpoints: {
          orderBy: { fecha: 'desc' },
          take: 20,
        },
        activities: {
          orderBy: { fecha: 'desc' },
          take: 10,
        },
      },
    });

    if (!lead) {
      return { error: `No se encontró ningún lead que coincida con "${leadIdOrSearch}".` };
    }

    return {
      id: lead.id,
      codigo: lead.leadId,
      nombre: lead.name,
      empresa: lead.companyName,
      telefono: lead.phone,
      email: lead.email,
      ciudad: lead.ciudad,
      fuente: lead.fuente,
      estado: lead.estado,
      productoInteres: lead.productoInteres,
      observaciones: lead.observaciones,
      vendedorAsignado: lead.vendedor?.name || 'Sin asignar',
      proximoSeguimiento: lead.proximoSeguimiento,
      totalInteracciones: lead.touchpoints?.length || 0,
      historialInteracciones: (lead.touchpoints || []).map((t: any) => ({
        id: t.id,
        canal: t.canal,
        fecha: t.fecha,
        etapa: t.etapa,
        participanteInterno: t.participanteInterno,
        participanteExterno: t.participanteExterno,
        resumen: t.resumen,
        objeciones: t.objeciones,
        puntosInteres: t.puntosInteres,
        preferenciasContacto: t.preferenciasContacto,
        materialEnviado: t.materialEnviado,
        materialAbierto: t.materialAbierto,
        respuestaMaterial: t.respuestaMaterial,
        compromisosPendientes: t.compromisosPendientes,
        fechaRecontacto: t.fechaRecontacto,
      })),
      actividadesRecientes: (lead.activities || []).map((a: any) => ({
        tipo: a.tipo,
        descripcion: a.descripcion,
        fecha: a.fecha,
        completada: a.completada,
      })),
    };
  }

  // --- Herramientas de Ventas / Generales ---

  private parsePeriod(periodo: string = 'mes'): { start: Date, end: Date, prevStart: Date, prevEnd: Date } {
    const now = new Date();
    const start = new Date(now);
    const prevStart = new Date(now);
    const prevEnd = new Date(now);
    
    start.setHours(0, 0, 0, 0);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setHours(23, 59, 59, 999);

    if (periodo === 'hoy') {
      prevStart.setDate(now.getDate() - 1);
      prevEnd.setDate(now.getDate() - 1);
    } else if (periodo === 'semana') {
      const day = now.getDay() || 7; 
      start.setDate(now.getDate() - day + 1);
      prevEnd.setTime(start.getTime() - 1);
      prevStart.setTime(prevEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
      prevStart.setHours(0, 0, 0, 0);
    } else if (periodo === 'año' || periodo === 'anio' || periodo === 'ano') {
      start.setMonth(0, 1);
      prevEnd.setTime(start.getTime() - 1);
      prevStart.setFullYear(now.getFullYear() - 1, 0, 1);
    } else {
      // mes por defecto
      start.setDate(1);
      prevEnd.setTime(start.getTime() - 1);
      prevStart.setMonth(now.getMonth() - 1, 1);
    }
    
    return { start, end: now, prevStart, prevEnd };
  }

  private async getSalesSummary(tenantId: string, roleName: string, periodo: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado. Solo Admin y Gerente pueden ver el resumen global.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const { start, end, prevStart, prevEnd } = this.parsePeriod(periodo);
    
    const currentOrders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } },
      select: { total: true }
    });
    
    const prevOrders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: prevStart, lte: prevEnd } },
      select: { total: true }
    });

    const currentTotal = currentOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
    const prevTotal = prevOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
    
    const currentTicket = currentOrders.length > 0 ? currentTotal / currentOrders.length : 0;

    const diffPercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);
    
    let interpretation = `Las ventas totales del periodo '${periodo}' fueron $${currentTotal.toFixed(2)} USD (${currentOrders.length} pedidos). `;
    if (diffPercent > 0) interpretation += `Hubo un aumento del ${diffPercent.toFixed(1)}% respecto al periodo anterior.`;
    else if (diffPercent < 0) interpretation += `Hubo una disminución del ${Math.abs(diffPercent).toFixed(1)}% respecto al periodo anterior.`;
    else interpretation += `Las ventas se mantuvieron estables respecto al periodo anterior.`;

    return { 
      periodo: periodo, 
      totalFacturadoUSD: currentTotal, 
      pedidosEntregados: currentOrders.length, 
      ticketPromedioUSD: currentTicket,
      comparacionPeriodoAnterior: { totalFacturadoUSD: prevTotal, variacionPorcentual: diffPercent },
      interpretacion: interpretation
    };
  }

  private async getSalesByPeriod(tenantId: string, roleName: string, periodoInicio: string, periodoFin: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const start = new Date(periodoInicio);
    const end = new Date(periodoFin);
    end.setHours(23, 59, 59, 999);
    
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration - 1);
    const prevEnd = new Date(start.getTime() - 1);

    const currentOrders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } }
    });
    const prevOrders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: prevStart, lte: prevEnd } }
    });

    const currentTotal = currentOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
    const prevTotal = prevOrders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
    const diffPercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

    return {
      rango: `${periodoInicio} a ${periodoFin}`,
      totalFacturadoUSD: currentTotal,
      cantidadPedidos: currentOrders.length,
      comparacionPeriodoAnterior: { totalFacturadoUSD: prevTotal, variacionPorcentual: diffPercent },
      interpretacion: `Ventas totales: $${currentTotal.toFixed(2)}. Variación del ${diffPercent.toFixed(1)}% respecto a un periodo anterior de igual duración.`
    };
  }

  private async getSalesByVendor(tenantId: string, roleName: string, userId: string, periodo: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { start, end } = this.parsePeriod(periodo);
    
    const whereClause: any = { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } };
    if (roleName === 'Vendedor') {
      whereClause.vendedorId = userId;
    } else if (roleName !== 'Admin' && roleName !== 'Gerente') {
      return { error: 'Permiso denegado.' };
    }

    const orders = await tenantClient.order.findMany({
      where: whereClause,
      include: { vendedor: { select: { name: true } } }
    });

    const totalVentas = orders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
    
    const vendorMap: Record<string, any> = {};
    for (const order of orders) {
      const vName = order.vendedor?.name || 'Desconocido';
      if (!vendorMap[vName]) vendorMap[vName] = { nombre: vName, pedidos: 0, montoTotal: 0 };
      vendorMap[vName].pedidos++;
      vendorMap[vName].montoTotal += Number(order.total);
    }

    const results = Object.values(vendorMap).map((v: any) => ({
      ...v,
      ticketPromedio: v.montoTotal / v.pedidos,
      contribucionPorcentual: totalVentas > 0 ? (v.montoTotal / totalVentas) * 100 : 0
    })).sort((a, b) => b.montoTotal - a.montoTotal);

    return {
      periodo,
      totalVentasGrupales: totalVentas,
      ventasPorVendedor: results,
      interpretacion: roleName === 'Vendedor' ? `Tus ventas en este periodo fueron $${totalVentas.toFixed(2)}.` : `Ventas agrupadas por vendedor calculadas exitosamente.`
    };
  }

  private async getSalesByCustomer(tenantId: string, roleName: string, userId: string, periodo: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { start, end } = this.parsePeriod(periodo);
    
    const whereClause: any = { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } };
    if (roleName === 'Vendedor') whereClause.vendedorId = userId;

    const orders = await tenantClient.order.findMany({
      where: whereClause,
      include: { cliente: { select: { nombreComercial: true } } }
    });

    const customerMap: Record<string, any> = {};
    for (const order of orders) {
      const cName = order.cliente?.nombreComercial || 'Desconocido';
      if (!customerMap[cName]) customerMap[cName] = { nombre: cName, pedidos: 0, montoTotal: 0, ultimaCompra: order.fecha };
      customerMap[cName].pedidos++;
      customerMap[cName].montoTotal += Number(order.total);
      if (new Date(order.fecha) > new Date(customerMap[cName].ultimaCompra)) customerMap[cName].ultimaCompra = order.fecha;
    }

    const results = Object.values(customerMap).sort((a: any, b: any) => b.montoTotal - a.montoTotal).slice(0, 15);
    return { periodo, ventasPorCliente: results, interpretacion: `Listando ventas de hasta 15 clientes ordenados por mayor volumen de compra en el periodo.` };
  }

  private async getSalesByProduct(tenantId: string, roleName: string, periodo: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { start, end } = this.parsePeriod(periodo);

    const orders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } },
      include: { items: { include: { product: { select: { nombre: true, sku: true } } } } }
    });

    let totalGlobal = 0;
    const prodMap: Record<string, any> = {};
    for (const order of orders) {
      totalGlobal += Number(order.total);
      for (const item of order.items) {
        const sku = item.product.sku;
        if (!prodMap[sku]) prodMap[sku] = { sku, nombre: item.product.nombre, cantidadVendida: 0, montoTotal: 0 };
        prodMap[sku].cantidadVendida += item.cantidad;
        prodMap[sku].montoTotal += Number(item.total);
      }
    }

    const results = Object.values(prodMap).map((p: any) => ({
      ...p,
      participacionPorcentual: totalGlobal > 0 ? (p.montoTotal / totalGlobal) * 100 : 0
    })).sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 15);

    return { periodo, ventasPorProducto: results, interpretacion: `Mostrando hasta 15 productos más vendidos por monto total.` };
  }

  private async getTopProducts(tenantId: string, roleName: string, periodo: string, limit: number = 10) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    return this.getHighRotationProducts(tenantId, roleName, periodo, limit);
  }

  private async getLeastProducts(tenantId: string, roleName: string, periodo: string, limit: number = 10) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    return this.getLowRotationProducts(tenantId, roleName, periodo, limit);
  }

  private async getTopCustomers(tenantId: string, roleName: string, periodo: string, limit: number = 10) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { start, end } = this.parsePeriod(periodo);

    const orders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } },
      include: { cliente: { select: { id: true, nombreComercial: true } } }
    });

    const sumMap: Record<string, any> = {};
    for (const o of orders) {
      if (!sumMap[o.cliente.id]) sumMap[o.cliente.id] = { nombre: o.cliente.nombreComercial, montoAcumulado: 0 };
      sumMap[o.cliente.id].montoAcumulado += Number(o.total);
    }

    const results = Object.values(sumMap).sort((a, b) => b.montoAcumulado - a.montoAcumulado).slice(0, limit);
    return { periodo, topClientes: results };
  }

  private async getAverageTicket(tenantId: string, roleName: string, userId: string, periodo: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { start, end } = this.parsePeriod(periodo);
    
    const whereClause: any = { estado: 'ENTREGADO', updatedAt: { gte: start, lte: end } };
    if (roleName === 'Vendedor') whereClause.vendedorId = userId;

    const orders = await tenantClient.order.findMany({ where: whereClause, select: { total: true } });
    const total = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const ticketPromedio = orders.length > 0 ? total / orders.length : 0;

    return { periodo, totalVentas: total, cantidadPedidos: orders.length, ticketPromedioUSD: ticketPromedio, interpretacion: `El ticket promedio es de $${ticketPromedio.toFixed(2)}.` };
  }

  private async getSalesTrend(tenantId: string, roleName: string, periodo: string = '6m') {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    let months = 6;
    if (periodo === '12m') months = 12;
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const orders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', updatedAt: { gte: start } },
      select: { total: true, updatedAt: true }
    });

    const trendMap: Record<string, number> = {};
    for (const order of orders) {
      const k = `${order.updatedAt.getFullYear()}-${(order.updatedAt.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!trendMap[k]) trendMap[k] = 0;
      trendMap[k] += Number(order.total);
    }

    const keys = Object.keys(trendMap).sort();
    const arr = keys.map(k => ({ mes: k, montoUSD: trendMap[k] }));

    let tendencia = 'ESTABLE';
    if (arr.length >= 2) {
      const f = arr[0].montoUSD;
      const l = arr[arr.length - 1].montoUSD;
      if (f > 0) {
        const diff = (l - f) / f;
        if (diff > 0.05) tendencia = 'CRECIENTE';
        else if (diff < -0.05) tendencia = 'DECRECIENTE';
      }
    }

    return { mesesAnalizados: months, tendenciaVisual: arr, diagnosticoTendencia: tendencia, interpretacion: `La tendencia general de ventas es ${tendencia.toLowerCase()}.` };
  }

  private async getQuoteConversion(tenantId: string, roleName: string, periodo: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { start, end } = this.parsePeriod(periodo);

    const quotes = await tenantClient.quote.findMany({
      where: { estado: { in: ['ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'] }, createdAt: { gte: start, lte: end } },
      select: { estado: true }
    });

    const total = quotes.length;
    const convertidas = quotes.filter((q: any) => q.estado === 'ACEPTADA').length; // ACEPTADA usually leads to ORDER
    const conversionRate = total > 0 ? (convertidas / total) * 100 : 0;

    return {
      periodo,
      cotizacionesEmitidas: total,
      cotizacionesConvertidas: convertidas,
      tasaConversionPorcentaje: conversionRate,
      interpretacion: `De ${total} cotizaciones, se han convertido ${convertidas} (${conversionRate.toFixed(1)}%).`
    };
  }

  private async getCommercialRecommendations(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    try {
      const tenantClient = this.prisma.getTenantClient(tenantId);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 1. Clientes VIP Inactivos
      const vipInactivos = await tenantClient.customer.findMany({
        where: { 
          tenantId,
          orders: { some: {} },
          NOT: { orders: { some: { fecha: { gte: thirtyDaysAgo } } } }
        },
        include: { orders: { select: { total: true } } }
      });

      const vipFiltered = vipInactivos.map((c: any) => ({
        nombreComercial: c.nombreComercial,
        ultimaCompra: c.orders[0]?.fecha,
        totalComprado: c.orders.reduce((sum: number, o: any) => sum + Number(o.total), 0)
      })).filter((c: any) => c.totalComprado > 5000).sort((a: any, b: any) => b.totalComprado - a.totalComprado).slice(0, 5);

      // 2. Cotizaciones pendientes antiguas
      const pendingQuotes = await tenantClient.quote.findMany({
        where: { tenantId, estado: { in: ['BORRADOR', 'ENVIADA'] }, fecha: { lte: sevenDaysAgo } },
        include: { cliente: { select: { nombreComercial: true } }, vendedor: { select: { name: true } } },
        take: 5
      });

      // 3. Productos con bajo movimiento y mucho stock
      const products = await tenantClient.product.findMany({
        where: { tenantId, estado: 'ACTIVO' },
        include: { productStock: true, orderItems: { include: { order: true }, where: { order: { fecha: { gte: thirtyDaysAgo } } } } }
      });

      const pRotacionBaja = products.filter((p: any) => {
        const vendida = p.orderItems.reduce((acc: number, item: any) => acc + item.cantidad, 0);
        const disp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
        return disp > (p.stockMinimo * 3) && vendida < (disp * 0.1);
      }).map((p: any) => ({ nombre: p.nombre, sku: p.sku, stock: (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0) })).slice(0, 5);

      const alerts: any[] = [];
      if (vipFiltered.length > 0) {
        alerts.push({ tipo: 'RETENCION_VIP', descripcion: 'Clientes de alto valor inactivos por más de 30 días.', detalles: vipFiltered });
      }
      if (pendingQuotes.length > 0) {
        alerts.push(
          { tipo: 'SEGUIMIENTO_COTIZACIONES', descripcion: 'Cotizaciones enviadas o en borrador hace más de 7 días sin respuesta.', detalles: pendingQuotes.map((q: any) => ({ num: q.numero, cliente: q.cliente?.nombreComercial, vendedor: q.vendedor?.name, monto: Number(q.total) })) },
        );
      }
      if (pRotacionBaja.length > 0) {
        alerts.push({ tipo: 'PROMOCION_PRODUCTOS', descripcion: 'Productos con alto stock disponible y baja rotación reciente.', detalles: pRotacionBaja });
      }

      return {
        totalAlertas: alerts.length,
        recomendacionesAccionables: alerts,
        interpretacion: alerts.length > 0 
          ? 'El sistema ha generado estas alertas comerciales accionables.' 
          : 'No hay alertas críticas en este momento. Las cotizaciones, clientes VIP e inventario están al día.'
      };
    } catch (e: any) {
      return { error: `Error calculando alertas comerciales: ${e.message}`, recomendacionesAccionables: [] };
    }
  }

  private async getCustomerInformation(tenantId: string, query: string, roleName: string, userId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const filterConditions: any[] = [
      { nombreComercial: { contains: query, mode: 'insensitive' } },
      { razonSocial: { contains: query, mode: 'insensitive' } }
    ];
    const whereClause: any = { OR: filterConditions };
    if (roleName === 'Vendedor') whereClause.vendedorId = userId;

    const customer = await tenantClient.customer.findFirst({
      where: whereClause,
      include: { orders: { orderBy: { fecha: 'desc' } } }
    });
    if (!customer) return { error: `No se encontró ningún cliente coincidente con "${query}"` };
    const totalComprado = customer.orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const ultimaCompra = customer.orders.length > 0 ? customer.orders[0].fecha : 'Nunca';
    return { nombre: customer.nombreComercial, contacto: customer.personaContacto, telefono: customer.telefono, email: customer.email, totalCompradoUSD: totalComprado, cantidadPedidos: customer.orders.length, ultimaCompra };
  }

  private async getInactiveCustomers(tenantId: string, dias = 90) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - dias);
    const customers = await tenantClient.customer.findMany({
      where: { orders: { none: { fecha: { gte: thresholdDate } } } },
      select: { nombreComercial: true, email: true, telefono: true }
    });
    return { diasInactividad: dias, totalClientesInactivos: customers.length, ejemplos: customers.slice(0, 5) };
  }

  private async getPendingOrders(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const orders = await tenantClient.order.findMany({
      where: { estado: { in: ['PENDIENTE', 'CONFIRMADO'] } },
      select: { numero: true, total: true, cliente: { select: { nombreComercial: true } }, estado: true }, take: 10
    });
    return { totalMostrados: orders.length, pedidos: orders };
  }

  private async getImportations(tenantId: string, roleName: string, estado?: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const where: any = { activo: true };
    if (estado) where.estado = estado;
    else where.estado = { notIn: ['RECIBIDA', 'CERRADA'] };
    const importations = await tenantClient.importation.findMany({ where, select: { codigo: true, estado: true, eta: true, paisOrigen: true }, take: 5 });
    return { resultados: importations };
  }

  private mapQuoteStatus(rawEstado?: string): any {
    if (!rawEstado) return undefined;
    const s = rawEstado.toUpperCase().trim();
    if (['PENDIENTE', 'PENDIENTES', 'ABIERTAS', 'EN_REVISION', 'ACTIVA', 'ACTIVAS'].includes(s)) {
      return { in: ['BORRADOR', 'ENVIADA'] };
    }
    if (['BORRADOR', 'BORRADORES'].includes(s)) return 'BORRADOR';
    if (['ENVIADA', 'ENVIADAS'].includes(s)) return 'ENVIADA';
    if (['ACEPTADA', 'ACEPTADAS', 'APROBADA', 'APROBADAS'].includes(s)) return 'ACEPTADA';
    if (['RECHAZADA', 'RECHAZADAS'].includes(s)) return 'RECHAZADA';
    if (['VENCIDA', 'VENCIDAS', 'EXPIRADA', 'EXPIRADAS'].includes(s)) return 'VENCIDA';
    
    const validStatuses = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'];
    if (validStatuses.includes(s)) {
      return s;
    }
    return undefined;
  }

  private async getQuotes(tenantId: string, estado?: string) {
    try {
      const tenantClient = this.prisma.getTenantClient(tenantId);
      const where: any = { tenantId };
      const statusCondition = this.mapQuoteStatus(estado);
      if (statusCondition) {
        where.estado = statusCondition;
      }

      const quotes = await tenantClient.quote.findMany({
        where, 
        take: 10, 
        orderBy: { fecha: 'desc' },
        select: { 
          id: true,
          numero: true, 
          total: true, 
          estado: true, 
          fecha: true,
          fechaVencimiento: true,
          cliente: { select: { id: true, nombreComercial: true } } 
        }
      });
      return { 
        total: quotes.length,
        filtroEstado: estado || 'TODAS',
        cotizaciones: quotes,
        interpretacion: quotes.length === 0
          ? `No se encontraron cotizaciones con estado "${estado || 'todas'}" en la base de datos.`
          : `Se encontraron ${quotes.length} cotizaciones registradas en la base de datos.`
      };
    } catch (e: any) {
      return { error: `Error al consultar cotizaciones: ${e.message}`, cotizaciones: [] };
    }
  }

  private async getActivities(tenantId: string, estado?: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const acts = await tenantClient.activity.findMany({
      where: { activo: true, ...(estado && { estado: estado as any }) }, take: 5, orderBy: { fecha: 'desc' },
      select: { titulo: true, estado: true, fecha: true, tipo: true, responsable: { select: { name: true } } }
    });
    return { resultados: acts };
  }

  // --- FASE 3.3: Nuevas Herramientas de Clientes ---
  private async searchCustomerByName(tenantId: string, nombre: string, roleName: string, userId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const filterConditions: any[] = [{ nombreComercial: { contains: nombre, mode: 'insensitive' } }, { razonSocial: { contains: nombre, mode: 'insensitive' } }];
    const whereClause: any = { OR: filterConditions };
    if (roleName === 'Vendedor') whereClause.vendedorId = userId;
    const clientes = await tenantClient.customer.findMany({ where: whereClause, take: 5, select: { id: true, nombreComercial: true, nitCi: true, ciudad: true, telefono: true, estado: true, vendedor: { select: { name: true } } } });
    if (clientes.length === 0) return { error: `Cliente no encontrado con nombre: ${nombre}` };
    return { resultados: clientes };
  }

  private async searchCustomerByNIT(tenantId: string, nit: string, roleName: string, userId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const whereClause: any = { tenantId, nitCi: nit };
    if (roleName === 'Vendedor') whereClause.vendedorId = userId;
    const cliente = await tenantClient.customer.findFirst({ where: whereClause, select: { id: true, nombreComercial: true, nitCi: true, ciudad: true, telefono: true, estado: true } });
    if (!cliente) return { error: `Cliente no encontrado con NIT: ${nit}` };
    return cliente;
  }

  private async getCustomerSalesInfo(tenantId: string, roleName: string, clienteId: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado. Solo Admin y Gerente pueden ver totales consolidados por cliente.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const cliente = await tenantClient.customer.findUnique({ where: { id: clienteId, tenantId }, include: { orders: { where: { estado: 'ENTREGADO' }, orderBy: { fecha: 'desc' } } } });
    if (!cliente) return { error: 'Cliente no encontrado.' };
    const totalComprado = cliente.orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    return { clienteId: cliente.id, nombre: cliente.nombreComercial, totalCompradoUSD: totalComprado, cantidadPedidosEntregados: cliente.orders.length, ultimaCompra: cliente.orders.length > 0 ? cliente.orders[0].fecha : 'Ninguna', montoUltimaCompraUSD: cliente.orders.length > 0 ? Number(cliente.orders[0].total) : 0 };
  }

  private async getCustomerQuotes(tenantId: string, clienteId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const quotes = await tenantClient.quote.findMany({ where: { clienteId, tenantId }, orderBy: { fecha: 'desc' }, take: 5, select: { numero: true, estado: true, fecha: true, total: true } });
    return { resultados: quotes };
  }

  private async getCustomerOrders(tenantId: string, clienteId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const orders = await tenantClient.order.findMany({ where: { clienteId, tenantId }, orderBy: { fecha: 'desc' }, take: 5, select: { numero: true, estado: true, fecha: true, total: true } });
    return { resultados: orders };
  }

  private async getCustomerActivities(tenantId: string, clienteId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const activities = await tenantClient.activity.findMany({ where: { clienteId, tenantId, activo: true }, orderBy: { fecha: 'desc' }, take: 5, select: { titulo: true, estado: true, fecha: true, tipo: true } });
    return { resultados: activities };
  }

  private async getCustomerSummary(tenantId: string, roleName: string, clienteId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const [cliente, quotes, orders, activities] = await Promise.all([
      tenantClient.customer.findUnique({ where: { id: clienteId, tenantId }, include: { vendedor: true } }),
      tenantClient.quote.findMany({ where: { clienteId, tenantId }, orderBy: { fecha: 'desc' }, take: 5 }),
      tenantClient.order.findMany({ where: { clienteId, tenantId, estado: 'ENTREGADO' }, orderBy: { fecha: 'desc' }, take: 5, include: { items: { include: { product: true } } } }),
      tenantClient.activity.findMany({ where: { clienteId, tenantId, activo: true }, orderBy: { fecha: 'desc' }, take: 5 })
    ]);
    if (!cliente) return { error: 'Cliente no encontrado.' };

    const totalComprado = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const ultimaCompra = orders.length > 0 ? orders[0].fecha : null;
    let ultimoProducto = 'Ninguno';
    if (orders.length > 0 && orders[0].items.length > 0) ultimoProducto = orders[0].items[0].product.nombre;
    const pendientes = quotes.filter((q: any) => q.estado === 'ENVIADA' || q.estado === 'BORRADOR').length;
    const actividadesPendientes = activities.filter((a: any) => a.estado === 'PENDIENTE').length;

    let recomendacion = 'Operación normal.';
    if (totalComprado > 5000 && (!ultimaCompra || (new Date().getTime() - ultimaCompra.getTime()) > 30 * 24 * 60 * 60 * 1000)) recomendacion = 'Cliente de alto valor inactivo. Sugerencia: Contactar urgente para reactivación.';
    else if (pendientes > 0) recomendacion = 'Cotizaciones pendientes encontradas. Sugerencia: Hacer seguimiento comercial para cierre.';
    else if (actividadesPendientes > 0) recomendacion = 'Tareas pendientes en agenda. Atender lo antes posible.';

    return {
      cliente: { nombre: cliente.nombreComercial, nit: cliente.nitCi, vendedor: cliente.vendedor?.name || 'Sin asignar' },
      ultimaCompra: ultimaCompra || 'Nunca', comprasAcumuladasUSD: roleName === 'Admin' || roleName === 'Gerente' ? totalComprado : 'Oculto (Requiere Admin)',
      ultimoProductoComprado: ultimoProducto, cotizacionesPendientes: pendientes, actividadesPendientes, recomendacion
    };
  }

  private async detectFrequentCustomers(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const clientes = await tenantClient.customer.findMany({ include: { _count: { select: { orders: { where: { estado: 'ENTREGADO' } } } } } });
    const sorted = clientes.sort((a: any, b: any) => b._count.orders - a._count.orders).slice(0, 5);
    return { topFrecuentes: sorted.map((c: any) => ({ nombre: c.nombreComercial, cantidadPedidos: c._count.orders })) };
  }

  private async detectHighValueCustomers(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const orders = await tenantClient.order.findMany({ where: { estado: 'ENTREGADO' }, select: { total: true, cliente: { select: { id: true, nombreComercial: true } } } });
    const sumaPorCliente: Record<string, { nombre: string, total: number }> = {};
    for (const o of orders) {
      if (!sumaPorCliente[o.cliente.id]) sumaPorCliente[o.cliente.id] = { nombre: o.cliente.nombreComercial, total: 0 };
      sumaPorCliente[o.cliente.id].total += Number(o.total);
    }
    const sorted = Object.values(sumaPorCliente).sort((a, b) => b.total - a.total).slice(0, 5);
    return { topVIP: sorted.map(c => ({ nombre: c.nombre, facturacionUSD: c.total })) };
  }

  private async recommendFollowUpCustomers(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const tresDias = new Date();
    tresDias.setDate(tresDias.getDate() - 3);
    const quotes = await tenantClient.quote.findMany({ where: { estado: 'ENVIADA', fecha: { lte: tresDias }, tenantId }, include: { cliente: true } });
    const recomendados = quotes.map((q: any) => ({ motivo: `Cotización ${q.numero} enviada hace más de 3 días sin respuesta.`, cliente: q.cliente.nombreComercial, montoAproximadoUSD: Number(q.total) }));
    return { requierenSeguimiento: recomendados.slice(0, 10) };
  }

  // --- FASE 3.4: INTELIGENCIA DE INVENTARIO ---

  private async getInventorySummary(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const stocks = await tenantClient.productStock.findMany({ where: { tenantId } });
    let fisico = 0, reservado = 0, transito = 0;
    for (const s of stocks) {
      fisico += s.stockFisico;
      reservado += s.stockReservado;
      transito += s.stockTransito;
    }
    return {
      totalProductosRegistrados: stocks.length,
      stockFisicoTotal: fisico,
      stockReservadoTotal: reservado,
      stockDisponibleTotal: fisico - reservado,
      stockEnTransitoTotal: transito
    };
  }

  private async getStockByProduct(tenantId: string, query: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const product = await tenantClient.product.findFirst({
      where: { OR: [{ sku: { contains: query, mode: 'insensitive' } }, { nombre: { contains: query, mode: 'insensitive' } }] },
      include: { productStock: true }
    });
    if (!product) return { error: `Producto "${query}" no encontrado.` };
    const stock = product.productStock;
    return {
      sku: product.sku, nombre: product.nombre,
      stockFisico: stock?.stockFisico || 0,
      stockReservado: stock?.stockReservado || 0,
      stockDisponible: (stock?.stockFisico || 0) - (stock?.stockReservado || 0),
      stockTransito: stock?.stockTransito || 0
    };
  }

  private async getLowStockProducts(tenantId: string, limit = 10) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true }
    });
    
    // Obtener proveedor de cada producto de su última importación. Sería muy costoso hacerlo en la query si no está relacionado directamente en la tabla product.
    // Usaremos solo campos de product y productStock.
    const lowStock = products.filter((p: any) => {
      const disponible = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      return disponible > 0 && disponible <= p.stockMinimo;
    }).map((p: any) => ({
      sku: p.sku, nombre: p.nombre,
      stockDisponible: (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0),
      stockMinimo: p.stockMinimo
    }));
    return { totalBajoStock: lowStock.length, productos: lowStock.slice(0, limit) };
  }

  private async getOutOfStockProducts(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true }
    });
    const outOfStock = products.filter((p: any) => {
      const disponible = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      return disponible <= 0;
    }).map((p: any) => ({ sku: p.sku, nombre: p.nombre, stockDisponible: 0, stockMinimo: p.stockMinimo }));
    return { totalAgotados: outOfStock.length, productos: outOfStock.slice(0, 10) };
  }

  private async getProductsInTransit(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const importations = await tenantClient.importation.findMany({
      where: { estado: { in: ['EN_TRANSITO', 'ADUANA'] } },
      include: { items: { include: { product: true } } }
    });
    
    const transitMap: Record<string, any> = {};
    for (const imp of importations) {
      for (const item of imp.items) {
        if (!transitMap[item.productId]) {
          transitMap[item.productId] = { sku: item.product.sku, nombre: item.product.nombre, cantidadEnTransito: 0 };
        }
        transitMap[item.productId].cantidadEnTransito += item.cantidad;
      }
    }
    return { productosEnTransito: Object.values(transitMap).slice(0, 15) };
  }

  private async getHighRotationProducts(tenantId: string, roleName: string, periodo = 'mes', limit = 10) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const dateLimit = new Date();
    if (periodo === 'mes') dateLimit.setDate(dateLimit.getDate() - 30);
    else if (periodo === 'trimestre') dateLimit.setDate(dateLimit.getDate() - 90);
    else dateLimit.setDate(dateLimit.getDate() - 30); // Default to month

    const orders = await tenantClient.order.findMany({
      where: { estado: 'ENTREGADO', fecha: { gte: dateLimit } },
      include: { items: { include: { product: { include: { productStock: true } } } } }
    });

    const salesMap: Record<string, { sku: string, nombre: string, vendida: number, stockDisponible: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!salesMap[item.productId]) {
          const stock = item.product.productStock;
          const disp = (stock?.stockFisico || 0) - (stock?.stockReservado || 0);
          salesMap[item.productId] = { sku: item.product.sku, nombre: item.product.nombre, vendida: 0, stockDisponible: disp };
        }
        salesMap[item.productId].vendida += item.cantidad;
      }
    }

    const sorted = Object.values(salesMap).sort((a, b) => b.vendida - a.vendida).slice(0, limit);
    return { periodo, productosMayorRotacion: sorted };
  }

  private async getLowRotationProducts(tenantId: string, roleName: string, periodo = 'mes', limit = 10) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const dateLimit = new Date();
    if (periodo === 'mes') dateLimit.setDate(dateLimit.getDate() - 30);
    else if (periodo === 'trimestre') dateLimit.setDate(dateLimit.getDate() - 90);
    else dateLimit.setDate(dateLimit.getDate() - 30);

    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true, orderItems: { include: { order: true }, where: { order: { estado: 'ENTREGADO', fecha: { gte: dateLimit } } } } }
    });

    const list = products.map((p: any) => {
      const vendida = p.orderItems.reduce((acc: number, item: any) => acc + item.cantidad, 0);
      const disp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      return { sku: p.sku, nombre: p.nombre, vendida, stockDisponible: disp };
    });

    const sorted = list.sort((a: any, b: any) => a.vendida - b.vendida).slice(0, limit);
    return { periodo, productosMenorRotacion: sorted };
  }

  private async compareSalesVsInventory(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30);

    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true, orderItems: { include: { order: true }, where: { order: { estado: 'ENTREGADO', fecha: { gte: dateLimit } } } } }
    });

    const analysis = products.map((p: any) => {
      const vendida = p.orderItems.reduce((acc: number, item: any) => acc + item.cantidad, 0);
      const disp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      let estado = 'Ajustado';
      if (disp > vendida * 3 && vendida > 0) estado = 'Sobredimensionado';
      else if (disp < vendida && vendida > 0) estado = 'Falta de Stock (Riesgo)';
      
      return { sku: p.sku, nombre: p.nombre, ventasMensuales: vendida, stockDisponible: disp, diagnostico: estado };
    });
    
    // Devolvemos solo algunos ejemplos destacados para no desbordar tokens
    return { analisis: analysis.filter((a: any) => a.diagnostico !== 'Ajustado').slice(0, 10) };
  }

  private async recommendReorderProducts(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 90); // Ultimos 90 dias

    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true, orderItems: { include: { order: true }, where: { order: { estado: 'ENTREGADO', fecha: { gte: dateLimit } } } } }
    });

    const recommendations = [];
    for (const p of products) {
      const vendidaEn90Dias = p.orderItems.reduce((acc: number, item: any) => acc + item.cantidad, 0);
      if (vendidaEn90Dias === 0) continue; // No recomendar si no hay rotacion
      
      const ventasPromedioMensual = vendidaEn90Dias / 3;
      const disp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      const transito = p.productStock?.stockTransito || 0;
      
      const coberturaReal = disp + transito;
      const necesitaReorden = coberturaReal <= p.stockMinimo || coberturaReal < ventasPromedioMensual * 1.5;

      if (necesitaReorden) {
        const sugerido = Math.ceil((ventasPromedioMensual * 2) - disp - transito);
        if (sugerido > 0) {
          recommendations.push({
            sku: p.sku, nombre: p.nombre, stockDisponible: disp, enTransito: transito, ventasPromedioMensual: Math.round(ventasPromedioMensual),
            sugeridoImportar: sugerido
          });
        }
      }
    }
    
    return { reimportacionesSugeridas: recommendations.sort((a, b) => b.sugeridoImportar - a.sugeridoImportar).slice(0, 15) };
  }

  private async getStockRiskProducts(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado.' };
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const products = await tenantClient.product.findMany({
      where: { estado: 'ACTIVO' },
      include: { productStock: true }
    });

    const risk = products.filter((p: any) => {
      const disp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      return disp <= (p.stockMinimo * 0.2); // 20% del mínimo
    }).map((p: any) => {
      const disp = (p.productStock?.stockFisico || 0) - (p.productStock?.stockReservado || 0);
      return { sku: p.sku, nombre: p.nombre, stockDisponible: disp, stockMinimo: p.stockMinimo, urgencia: disp <= 0 ? 'CRITICA - AGOTADO' : 'ALTA - CASI AGOTADO' };
    });

    return { productosEnRiesgo: risk.slice(0, 15) };
  }

  // --- FASE 3.6: MOTOR DE RECOMENDACIONES ---

  private async getActiveRecommendations(tenantId: string, roleName: string) {
    if (roleName !== 'Admin' && roleName !== 'Gerente') return { error: 'Permiso denegado. Solo Admin y Gerente pueden ver las recomendaciones globales activas.' };
    
    try {
      const tenantClient = this.prisma.getTenantClient(tenantId);
      
      const recs = await tenantClient.recommendation.findMany({
        where: {
          tenantId,
          estado: { in: ['NUEVA', 'PENDIENTE', 'VISTA'] }
        },
        orderBy: { fechaCreacion: 'desc' },
        take: 20
      });

      if (recs.length === 0) {
        // Generar alertas comerciales accionables en tiempo real
        return this.getCommercialRecommendations(tenantId, roleName);
      }

      return {
        totalActivas: recs.length,
        recomendaciones: recs.map((r: any) => ({
          tipo: r.tipo,
          severidad: r.severidad,
          titulo: r.titulo,
          descripcion: r.descripcion,
          fecha: r.fechaCreacion
        })),
        interpretacion: 'Alertas y recomendaciones activas registradas para atención del equipo comercial.'
      };
    } catch (e: any) {
      return { error: `Error consultando recomendaciones activas: ${e.message}` };
    }
  }

  // --- FASE 4.29: ANÁLISIS DE MARKETING Y CAMPAÑAS ---

  private async getCampaignPerformance(tenantId: string, roleName: string, userId: string, args: any) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = (roleName || '').toLowerCase();

    const where: any = { tenantId };
    if (role === 'vendedor') {
      where.OR = [
        { responsableId: userId },
        { vendedorObjetivoId: userId }
      ];
    }
    if (args?.estado) where.estado = args.estado;
    if (args?.canal) where.canal = args.canal;

    const campaigns = await tenantClient.campaign.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        canal: true,
        estado: true,
        tipo: true,
        totalDestinatarios: true,
        totalEnviados: true,
        totalEntregados: true,
        totalFallidos: true,
        totalRespuestas: true,
        totalLeadsGenerados: true,
        totalClientesVinculados: true,
        costoTotal: true,
        fechaEnvioProgramado: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    if (campaigns.length === 0) {
      return { totalCampanas: 0, mensaje: 'No se encontraron campañas con los criterios especificados.' };
    }

    const metricas = campaigns.map((c: any) => {
      const tasaRespuesta = c.totalEnviados > 0 ? Number(((c.totalRespuestas / c.totalEnviados) * 100).toFixed(2)) : 0;
      const tasaEntrega = c.totalEnviados > 0 ? Number(((c.totalEntregados / c.totalEnviados) * 100).toFixed(2)) : 0;
      return {
        id: c.id,
        nombre: c.nombre,
        canal: c.canal,
        estado: c.estado,
        enviados: c.totalEnviados,
        entregados: c.totalEntregados,
        tasaEntrega: `${tasaEntrega}%`,
        respuestas: c.totalRespuestas,
        tasaRespuesta: `${tasaRespuesta}%`,
        leadsGenerados: c.totalLeadsGenerados,
        clientesReactivados: c.totalClientesVinculados,
        costoTotalUSD: Number(c.costoTotal || 0)
      };
    });

    return {
      totalCampanas: campaigns.length,
      campanas: metricas
    };
  }

  private async getBestCampaign(tenantId: string, roleName: string, userId: string, criterio: string = 'tasa_respuesta') {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = (roleName || '').toLowerCase();

    const where: any = { tenantId, totalEnviados: { gt: 0 } };
    if (role === 'vendedor') {
      where.OR = [
        { responsableId: userId },
        { vendedorObjetivoId: userId }
      ];
    }

    const campaigns = await tenantClient.campaign.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        canal: true,
        estado: true,
        tipo: true,
        totalDestinatarios: true,
        totalEnviados: true,
        totalEntregados: true,
        totalRespuestas: true,
        totalLeadsGenerados: true,
        totalClientesVinculados: true,
        costoTotal: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    if (campaigns.length === 0) {
      return { mensaje: 'No hay campañas con mensajes enviados registradas para determinar la mejor.' };
    }

    let best: any = null;
    let bestScore = -1;

    for (const c of campaigns) {
      const tasaRespuesta = (c.totalRespuestas / c.totalEnviados) * 100;
      let score = 0;
      if (criterio === 'leads_generados') {
        score = (c.totalLeadsGenerados * 10) + tasaRespuesta;
      } else {
        score = tasaRespuesta + (c.totalLeadsGenerados * 2);
      }

      if (score > bestScore) {
        bestScore = score;
        best = {
          ...c,
          tasaRespuesta: Number(tasaRespuesta.toFixed(2)),
          costoTotal: Number(c.costoTotal || 0)
        };
      }
    }

    return {
      mejorCampana: best,
      criterioEvaluado: criterio,
      motivoExito: `Logró una tasa de respuesta del ${best.tasaRespuesta}% con ${best.totalRespuestas} respuestas y ${best.totalLeadsGenerados} leads generados de ${best.totalEnviados} mensajes enviados.`,
      recomendacion: `Se aconseja repetir una versión actualizada de "${best.nombre}" utilizando el canal ${best.canal}, segmentando a contactos con características similares a la audiencia original.`
    };
  }

  private async getUnresponsiveCustomers(tenantId: string, roleName: string, userId: string, limit: number = 20) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const role = (roleName || '').toLowerCase();

    const maxItems = Math.min(100, Math.max(1, Number(limit) || 20));
    const where: any = {
      tenantId,
      clienteId: { not: null },
      respondio: false,
    };

    if (role === 'vendedor') {
      where.cliente = { vendedorId: userId };
    }

    const recipients = await tenantClient.campaignRecipient.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        cliente: {
          select: {
            id: true,
            nombreComercial: true,
            razonSocial: true,
            telefono: true,
            whatsapp: true,
          }
        },
        campaign: {
          select: {
            id: true,
            nombre: true,
            canal: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: maxItems
    });

    return {
      totalSinRespuesta: recipients.length,
      contactos: recipients.map((r: any) => ({
        clienteId: r.cliente?.id,
        nombre: r.cliente?.nombreComercial || r.cliente?.razonSocial || 'Sin nombre',
        telefono: r.cliente?.whatsapp || r.cliente?.telefono || 'Sin teléfono',
        campanaEnviada: r.campaign?.nombre,
        canal: r.campaign?.canal,
        fechaEnvio: r.createdAt,
      })),
      sugerenciaAccion: 'Se sugiere programar una llamada de seguimiento o un mensaje personalizado vía asesor comercial para los contactos que no respondieron a la campaña masiva.'
    };
  }
}
