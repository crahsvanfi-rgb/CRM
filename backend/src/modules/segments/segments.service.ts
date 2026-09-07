import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segment.dto.js';
import { Segment, SegmentType } from '@prisma/client';

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createSegmentDto: CreateSegmentDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.segment.create({
      data: {
        tenantId,
        nombre: createSegmentDto.nombre,
        descripcion: createSegmentDto.descripcion,
        tipoSegmento: createSegmentDto.tipoSegmento,
        condiciones: createSegmentDto.condiciones,
      }
    });
  }

  async findAll(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.segment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const segment = await tenantClient.segment.findUnique({
      where: { id, tenantId }
    });
    if (!segment) {
      throw new NotFoundException('Segmento no encontrado');
    }
    return segment;
  }

  async update(tenantId: string, id: string, updateSegmentDto: UpdateSegmentDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, id);
    return tenantClient.segment.update({
      where: { id, tenantId },
      data: {
        nombre: updateSegmentDto.nombre,
        descripcion: updateSegmentDto.descripcion,
        tipoSegmento: updateSegmentDto.tipoSegmento,
        condiciones: updateSegmentDto.condiciones ? (updateSegmentDto.condiciones as any) : undefined,
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, id);
    return tenantClient.segment.delete({
      where: { id, tenantId }
    });
  }

  /**
   * Transforma las condiciones JSON a un objeto Prisma 'where'
   */
  buildPrismaWhere(condiciones: Record<string, any>): Record<string, any> {
    if (!condiciones || !condiciones.reglas || !Array.isArray(condiciones.reglas)) {
      return {};
    }

    const operador = condiciones.operador?.toUpperCase() === 'OR' ? 'OR' : 'AND';
    const whereRules: any[] = [];

    for (const regla of condiciones.reglas) {
      const { campo, operador: op, valor } = regla;
      if (!campo || !op || valor === undefined) continue;

      let prismaOp = {};
      switch (op) {
        case '=':
          prismaOp = { equals: valor };
          break;
        case '!=':
          prismaOp = { not: valor };
          break;
        case '>':
          prismaOp = { gt: valor };
          break;
        case '>=':
          prismaOp = { gte: valor };
          break;
        case '<':
          prismaOp = { lt: valor };
          break;
        case '<=':
          prismaOp = { lte: valor };
          break;
        case 'CONTAINS':
          prismaOp = { contains: valor, mode: 'insensitive' };
          break;
        case 'IN':
          prismaOp = { in: Array.isArray(valor) ? valor : [valor] };
          break;
        default:
          continue; // Operador no soportado
      }

      // Casos especiales para campos
      if (campo === 'ultimaCompra' && (op === '>' || op === '<' || op === '>=' || op === '<=')) {
        // valor es en dias. ultimaCompra > 90 días significa fecha < hace 90 días
        const dias = parseInt(valor, 10);
        if (isNaN(dias)) continue;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - dias);
        
        if (op === '>') prismaOp = { lt: targetDate };
        if (op === '>=') prismaOp = { lte: targetDate };
        if (op === '<') prismaOp = { gt: targetDate };
        if (op === '<=') prismaOp = { gte: targetDate };
        
        whereRules.push({
          orders: {
            some: {
              createdAt: prismaOp
            }
          }
        });
      } else if (campo === 'totalComprado') {
        // Requiere una agregación, para un MVP usamos un approx o ignoramos,
        // Como Prisma no soporta agregation en where clause fácilmente, lo evitamos o lo simulamos
      } else {
        whereRules.push({ [campo]: prismaOp });
      }
    }

    if (whereRules.length === 0) return {};
    
    return { [operador]: whereRules };
  }

  async preview(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const segment = await this.findOne(tenantId, id);

    const whereClause = this.buildPrismaWhere(segment.condiciones as Record<string, any>);
    
    // Inyectar tenantId en la query principal siempre por seguridad extra
    whereClause.tenantId = tenantId;

    if (segment.tipoSegmento === SegmentType.CLIENTES) {
      const customers = await tenantClient.customer.findMany({
        where: whereClause,
        select: { id: true, razonSocial: true, numeroDocumento: true, telefono: true, estado: true },
        take: 100 // Limitar preview
      });
      return { count: customers.length, data: customers };
    } else {
      const leads = await tenantClient.lead.findMany({
        where: whereClause,
        select: { id: true, nombre: true, empresa: true, telefono: true, estado: true },
        take: 100
      });
      return { count: leads.length, data: leads };
    }
  }
}

