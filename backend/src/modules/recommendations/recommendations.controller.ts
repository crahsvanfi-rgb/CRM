import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, Req, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard.js';
import { RecommendationEngineService } from './recommendation-engine.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RecommendationStatus, RecommendationType, Severity } from '@prisma/client';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getRecommendations(
    @Req() req: any,
    @Query('tipo') tipo?: RecommendationType,
    @Query('estado') estado?: RecommendationStatus,
    @Query('severidad') severidad?: Severity,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('No tienes permisos para ver el listado global de recomendaciones.');
    }

    const where: any = { tenantId };
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (severidad) where.severidad = severidad;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const [items, total] = await Promise.all([
      tenantClient.recommendation.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { fechaCreacion: 'desc' }
      }),
      tenantClient.recommendation.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page: parseInt(page, 10),
        lastPage: Math.ceil(total / parseInt(limit, 10))
      }
    };
  }

  @Get('active')
  async getActiveRecommendations(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('Solo gerencia puede ver las alertas globales.');
    }

    const recs = await this.recommendationEngine.getActiveRecommendations(tenantId);
    
    // Sort logic to prioritize Crítica > Alta > Media > Baja
    const severidadWeight: Record<Severity, number> = {
      [Severity.CRITICA]: 4,
      [Severity.ALTA]: 3,
      [Severity.MEDIA]: 2,
      [Severity.BAJA]: 1,
    };

    return recs.sort((a: any, b: any) => severidadWeight[b.severidad as Severity] - severidadWeight[a.severidad as Severity]);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('Solo administradores pueden disparar la generación.');
    }

    return this.recommendationEngine.generateForTenant(tenantId);
  }

  @Patch(':id')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Query('estado') estado: RecommendationStatus
  ) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('Permiso denegado.');
    }

    return tenantClient.recommendation.update({
      where: { id, tenantId },
      data: {
        estado,
        fechaResolucion: estado === RecommendationStatus.RESUELTA ? new Date() : undefined
      }
    });
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('Permiso denegado.');
    }

    // Soft delete equivalent
    return tenantClient.recommendation.update({
      where: { id, tenantId },
      data: { estado: RecommendationStatus.DESCARTADA }
    });
  }
}
