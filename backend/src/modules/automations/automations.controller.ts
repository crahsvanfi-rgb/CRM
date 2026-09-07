import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AutomationEngineService } from './automation-engine.service.js';
import { AutomationEvent, AutomationAction } from '@prisma/client';

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: AutomationEngineService
  ) {}

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('Solo administradores pueden crear automatizaciones.');
    }

    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.automation.create({
      data: {
        tenantId,
        nombre: body.nombre,
        descripcion: body.descripcion,
        activa: body.activa !== undefined ? body.activa : true,
        evento: body.evento as AutomationEvent,
        condiciones: body.condiciones || {},
        accion: body.accion as AutomationAction,
        configuracionAccion: body.configuracionAccion || {}
      }
    });
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('evento') evento?: AutomationEvent,
    @Query('activa') activa?: string
  ) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    const where: any = { tenantId };
    if (evento) where.evento = evento;
    if (activa !== undefined) where.activa = activa === 'true';

    // Vendedores pueden ver reglas si es necesario para transparencia, pero acá restringiremos a Admin/Gerente para simplificar
    if (roleName !== 'Admin' && roleName !== 'Gerente') {
      throw new ForbiddenException('Permiso denegado.');
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [items, total] = await Promise.all([
      tenantClient.automation.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' }
      }),
      tenantClient.automation.count({ where })
    ]);

    return { items, meta: { total, page: parseInt(page, 10), lastPage: Math.ceil(total / parseInt(limit, 10)) } };
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    const automation = await tenantClient.automation.findUnique({
      where: { id, tenantId },
      include: {
        executions: {
          orderBy: { fechaEjecucion: 'desc' },
          take: 5
        }
      }
    });
    
    if (!automation) throw new Error('Automatización no encontrada');
    return automation;
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    const updateData: any = {};
    if (body.nombre) updateData.nombre = body.nombre;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.activa !== undefined) updateData.activa = body.activa;
    if (body.condiciones) updateData.condiciones = body.condiciones;
    if (body.configuracionAccion) updateData.configuracionAccion = body.configuracionAccion;
    if (body.accion) updateData.accion = body.accion;
    if (body.evento) updateData.evento = body.evento;

    return tenantClient.automation.update({
      where: { id, tenantId },
      data: updateData
    });
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    return tenantClient.automation.delete({
      where: { id, tenantId }
    });
  }

  @Get(':id/executions')
  async getExecutions(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;
    const tenantClient = this.prisma.getTenantClient(tenantId);

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = { tenantId, automationId: id };

    const [items, total] = await Promise.all([
      tenantClient.automationExecution.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { fechaEjecucion: 'desc' }
      }),
      tenantClient.automationExecution.count({ where })
    ]);

    return { items, meta: { total, page: parseInt(page, 10), lastPage: Math.ceil(total / parseInt(limit, 10)) } };
  }

  @Post('execute/:id')
  @HttpCode(HttpStatus.OK)
  async executeManual(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    return this.engine.executeAutomationManually(tenantId, id);
  }
}
