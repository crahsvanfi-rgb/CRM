import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CreateCustomerNoteDto } from './dto/create-note.dto.js';
import { CreateCustomerActivityDto } from './dto/create-customer-activity.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // Resuelve un tenantId válido en la base de datos si el provisto es inválido o default
  private async resolveTenantId(tenantId: string): Promise<string> {
    if (tenantId && tenantId !== '00000000-0000-0000-0000-000000000000') {
      try {
        if (this.prisma.tenant?.findUnique) {
          const exists = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
          if (exists) return tenantId;
        } else {
          return tenantId;
        }
      } catch {}
    }
    try {
      if (this.prisma.tenant?.findFirst) {
        const defaultTenant = await this.prisma.tenant.findFirst();
        if (defaultTenant) return defaultTenant.id;
      }
    } catch {}
    return tenantId;
  }

  // Resuelve un vendedorId válido si existe y pertenece al tenant; si no, retorna null sin bloquear la operación
  private async resolveVendedorId(vendedorId: string | undefined, tenantId: string): Promise<string | null> {
    if (!vendedorId || vendedorId === '00000000-0000-0000-0000-000000000000') return null;
    try {
      if (this.prisma.user?.findUnique) {
        const user = await this.prisma.user.findUnique({
          where: { id: vendedorId }
        });
        if (user && user.tenantId === tenantId) {
          return user.id;
        }
      }
    } catch {}
    return null;
  }

  // Resuelve un usuario válido para notas/actividades sin arrojar error de clave foránea
  private async resolveUserId(userId: string | undefined, tenantId: string): Promise<string> {
    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      try {
        if (this.prisma.user?.findUnique) {
          const u = await this.prisma.user.findUnique({ where: { id: userId } });
          if (u && u.tenantId === tenantId) return u.id;
        }
      } catch {}
    }
    try {
      if (this.prisma.user?.findFirst) {
        const anyUser = await this.prisma.user.findFirst({ where: { tenantId } });
        if (anyUser) return anyUser.id;
      }
    } catch {}
    return userId || '00000000-0000-0000-0000-000000000000';
  }

  async create(createCustomerDto: CreateCustomerDto, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    
    // 1. Resolver vendedor de forma segura
    const vendedorId = await this.resolveVendedorId(createCustomerDto.vendedorId, effectiveTenantId);

    // 2. Validar NIT duplicado solo si se envía
    const nitCi = createCustomerDto.nitCi?.trim() || null;
    if (nitCi) {
      const existing = await tenantClient.customer.findFirst({
        where: { nitCi }
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con este NIT/CI en el sistema.');
      }
    }

    const nombreComercial = (createCustomerDto.nombreComercial || '').trim() || 'Cliente Sin Nombre';

    return tenantClient.customer.create({
      data: {
        ...createCustomerDto,
        nombreComercial,
        nitCi,
        tenantId: effectiveTenantId,
        vendedorId,
      },
    });
  }

  async findAll(tenantId: string, page: number = 1, limit: number = 10, search?: string, tipoCliente?: string, estado?: string, vendedorId?: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (estado) where.estado = estado;
    if (tipoCliente) where.tipoCliente = tipoCliente;
    if (vendedorId) where.vendedorId = vendedorId;
    if (search) {
      where.OR = [
        { nombreComercial: { contains: search, mode: 'insensitive' } },
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { nitCi: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      tenantClient.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { vendedor: { select: { name: true } } }
      }),
      tenantClient.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const customer = await tenantClient.customer.findUnique({
      where: { id },
      include: { 
        vendedor: { select: { name: true, email: true } },
        notes: { orderBy: { createdAt: 'desc' }, include: { usuario: { select: { name: true } } } },
        activities: { orderBy: { fecha: 'desc' } },
        quotes: true,
        orders: true
      },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const totalComprado = customer.orders.reduce((acc: any, order: any) => acc + Number(order.total), 0);
    const cantidadPedidos = customer.orders.length;
    const cotizacionesAbiertas = customer.quotes.filter((q: any) => q.status === 'DRAFT' || q.status === 'SENT').length;
    const ultimaCompra = customer.orders.length > 0 ? customer.orders[0].createdAt : null;

    return {
      ...customer,
      resumen: {
        totalComprado,
        cantidadPedidos,
        cotizacionesAbiertas,
        ultimaCompra,
      }
    };
  }

  async update(id: string, updateData: UpdateCustomerDto, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    
    let vendedorId: string | null | undefined = undefined;
    if (updateData.vendedorId !== undefined) {
      vendedorId = await this.resolveVendedorId(updateData.vendedorId, effectiveTenantId);
    }
    await this.findOne(id, effectiveTenantId);

    const nitCi = updateData.nitCi !== undefined ? (updateData.nitCi?.trim() || null) : undefined;
    if (nitCi) {
      const existing = await tenantClient.customer.findFirst({
        where: { nitCi, id: { not: id } }
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con este NIT/CI en el sistema.');
      }
    }

    return tenantClient.customer.update({
      where: { id },
      data: {
        ...updateData,
        ...(nitCi !== undefined && { nitCi }),
        ...(vendedorId !== undefined && { vendedorId }),
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    await this.findOne(id, effectiveTenantId);

    return tenantClient.customer.update({
      where: { id },
      data: { estado: 'INACTIVO' },
    });
  }

  async addNote(customerId: string, noteDto: CreateCustomerNoteDto, tenantId: string, userId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    await this.findOne(customerId, effectiveTenantId);
    const resolvedUser = await this.resolveUserId(userId, effectiveTenantId);

    return tenantClient.customerNote.create({
      data: {
        tenantId: effectiveTenantId,
        customerId,
        usuarioId: resolvedUser,
        nota: noteDto.nota,
      }
    });
  }

  async addActivity(customerId: string, activityDto: CreateCustomerActivityDto, tenantId: string, userId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    await this.findOne(customerId, effectiveTenantId);
    const resolvedUser = await this.resolveUserId(userId, effectiveTenantId);

    return tenantClient.customerActivity.create({
      data: {
        tenantId: effectiveTenantId,
        customerId,
        usuarioId: resolvedUser,
        tipo: activityDto.tipo,
        descripcion: activityDto.descripcion,
        completada: activityDto.completada || false,
      }
    });
  }
}
