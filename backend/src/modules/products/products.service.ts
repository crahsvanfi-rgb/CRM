import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
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

  async create(createProductDto: CreateProductDto, tenantId: string, usuarioId?: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const { stockInicial, ...productFields } = createProductDto;
    let sku = (createProductDto.sku || '').trim();
    if (!sku) {
      const count = tenantClient.product?.count ? await tenantClient.product.count() : 0;
      sku = `PROD-${(count + 1).toString().padStart(4, '0')}`;
    }
    const existing = await tenantClient.product.findUnique({ where: { tenantId_sku: { tenantId: effectiveTenantId, sku } } });
    if (existing) throw new ConflictException(`El SKU ${sku} ya existe en este tenant.`);
    let categoriaId = createProductDto.categoriaId || undefined;
    if (categoriaId) {
      const cat = await tenantClient.category.findUnique({ where: { id: categoriaId, tenantId: effectiveTenantId } });
      if (!cat) throw new BadRequestException(`La categoría indicada no pertenece a este tenant o no existe.`);
    }
    const precioVenta = createProductDto.precioVenta !== undefined ? Number(createProductDto.precioVenta) : 0;
    const costoBase = createProductDto.costoBase !== undefined ? Number(createProductDto.costoBase) : 0;
    const stockMinimo = createProductDto.stockMinimo !== undefined ? Number(createProductDto.stockMinimo) : 0;
    const initialStock = stockInicial !== undefined ? Number(stockInicial) : 0;
    if (!Number.isFinite(initialStock) || initialStock < 0) throw new BadRequestException('El stock inicial no puede ser negativo.');
    return tenantClient.$transaction(async (tx: any) => {
      const product = await tx.product.create({ data: { ...productFields, sku, categoriaId: categoriaId || null, precioVenta, costoBase, stockMinimo, tenantId: effectiveTenantId } });
      if (initialStock > 0) {
        const user = await tx.user.findFirst({ where: { id: usuarioId, tenantId: effectiveTenantId, isActive: true }, select: { id: true } }) || await tx.user.findFirst({ where: { tenantId: effectiveTenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
        if (!user) throw new BadRequestException('No existe un usuario válido para registrar el stock inicial.');
        await tx.productStock.create({ data: { tenantId: effectiveTenantId, productId: product.id, stockFisico: initialStock, stockReservado: 0, stockTransito: 0 } });
        await tx.inventoryMovement.create({ data: { tenantId: effectiveTenantId, productId: product.id, tipo: 'AJUSTE_POSITIVO', cantidad: initialStock, stockAnterior: 0, stockPosterior: initialStock, motivo: 'Stock inicial del producto', usuarioId: user.id } });
      }
      return product;
    });
  }
  async findAll(tenantId: string, page: number = 1, limit: number = 10, search?: string, categoriaId?: string, estado?: any) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: effectiveTenantId,
      estado: estado || 'ACTIVO',
    };

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { codigoInterno: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      tenantClient.product.count({ where }),
      tenantClient.product.findMany({
        where,
        skip,
        take: limit,
        include: { categoria: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    const product = await tenantClient.product.findUnique({
      where: { id, tenantId: effectiveTenantId },
      include: { categoria: true }
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    await this.findOne(id, effectiveTenantId); // Validates existence

    if ((updateProductDto as any).categoriaId) {
      const cat = await tenantClient.category.findUnique({
        where: { id: (updateProductDto as any).categoriaId, tenantId: effectiveTenantId }
      });
      if (!cat) {
        throw new BadRequestException(`La categoría indicada no pertenece a este tenant o no existe.`);
      }
    }

    return tenantClient.product.update({
      where: { id, tenantId: effectiveTenantId },
      data: updateProductDto,
    });
  }

  async remove(id: string, tenantId: string) {
    return this.update(id, { estado: 'INACTIVO' as any }, tenantId);
  }

  async getStock(id: string, tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    await this.findOne(id, effectiveTenantId);
    
    // Placeholder logic for future phases
    return {
      disponible: 0,
      reservado: 0,
      enTransito: 0
    };
  }
}
