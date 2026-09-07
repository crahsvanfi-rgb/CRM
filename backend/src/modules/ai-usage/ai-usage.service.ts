import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateAiUsageDto } from './dto/create-ai-usage.dto.js';

const PRECIOS: Record<string, { entrada: number; salida: number }> = {
  'openai/gpt-4o-mini': { entrada: 0.00000015, salida: 0.0000006 },
  'openai/gpt-4o': { entrada: 0.0000025, salida: 0.00001 },
  'anthropic/claude-3.5-sonnet': { entrada: 0.000003, salida: 0.000015 },
};

const DEFAULT_PRICE = { entrada: 0.000001, salida: 0.000002 };

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private prisma: PrismaService) {}

  async recordUsage(tenantId: string, dto: CreateAiUsageDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const promptTokens = dto.promptTokens || 0;
    const completionTokens = dto.completionTokens || 0;
    const totalTokens = promptTokens + completionTokens;

    const price = PRECIOS[dto.modelo] || DEFAULT_PRICE;
    
    const costoEntrada = promptTokens * price.entrada;
    const costoSalida = completionTokens * price.salida;
    const costoTotal = costoEntrada + costoSalida;

    try {
      const record = await tenantClient.aIUsage.create({
        data: {
          tenantId,
          usuarioId: dto.usuarioId,
          agente: dto.agente,
          modelo: dto.modelo,
          tipoOperacion: dto.tipoOperacion,
          conversationId: dto.conversationId,
          promptTokens,
          completionTokens,
          totalTokens,
          costoEntrada,
          costoSalida,
          costoTotal,
          precioEntradaPorToken: price.entrada,
          precioSalidaPorToken: price.salida,
        },
      });
      return record;
    } catch (error: any) {
      this.logger.error(`Error recording AI usage: ${error.message}`, error.stack);
      // We don't want to break the main flow if logging fails
      return null;
    }
  }

  async getUsage(tenantId: string, query: any, userId?: string, userRole?: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { usuarioId, agente, tipoOperacion, fechaInicio, fechaFin, page = '1', limit = '10' } = query;
    
    const where: any = {};
    
    // RBAC: If seller, only see own usage
    if (userRole === 'Vendedor') {
      where.usuarioId = userId;
    } else if (usuarioId) {
      where.usuarioId = usuarioId;
    }
    
    if (agente) where.agente = agente;
    if (tipoOperacion) where.tipoOperacion = tipoOperacion;
    
    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) where.fecha.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha.lte = new Date(fechaFin);
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [data, total] = await Promise.all([
      tenantClient.aIUsage.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { fecha: 'desc' },
        include: { usuario: { select: { name: true, email: true } } }
      }),
      tenantClient.aIUsage.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit))
      }
    };
  }

  async getSummary(tenantId: string, query: any, userId?: string, userRole?: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const { fechaInicio, fechaFin } = query;
    
    const where: any = {};
    
    if (userRole === 'Vendedor') {
      where.usuarioId = userId;
    }
    
    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) where.fecha.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha.lte = new Date(fechaFin);
    }

    const aggregations = await tenantClient.aIUsage.aggregate({
      where,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costoTotal: true
      },
      _count: {
        id: true
      }
    });

    const byAgent = await tenantClient.aIUsage.groupBy({
      by: ['agente'],
      where,
      _sum: { costoTotal: true, totalTokens: true },
      _count: { id: true }
    });

    const byModel = await tenantClient.aIUsage.groupBy({
      by: ['modelo'],
      where,
      _sum: { costoTotal: true, totalTokens: true },
      _count: { id: true }
    });

    const byType = await tenantClient.aIUsage.groupBy({
      by: ['tipoOperacion'],
      where,
      _sum: { costoTotal: true, totalTokens: true },
      _count: { id: true }
    });

    return {
      global: {
        totalTokens: aggregations._sum.totalTokens || 0,
        promptTokens: aggregations._sum.promptTokens || 0,
        completionTokens: aggregations._sum.completionTokens || 0,
        costoTotal: aggregations._sum.costoTotal || 0,
        operaciones: aggregations._count.id || 0
      },
      byAgent,
      byModel,
      byType
    };
  }
}
