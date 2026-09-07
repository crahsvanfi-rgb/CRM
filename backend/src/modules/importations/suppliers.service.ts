import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSupplierDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.supplier.create({
      data: {
        tenantId,
        nombre: dto.nombre,
        pais: dto.pais,
        contacto: dto.contacto,
        email: dto.email,
        telefono: dto.telefono,
        direccion: dto.direccion
      }
    });
  }

  async findAll(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.supplier.findMany({
      where: { tenantId, activo: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const supplier = await tenantClient.supplier.findUnique({
      where: { id, tenantId }
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, id);
    return tenantClient.supplier.update({
      where: { id, tenantId },
      data: dto
    });
  }

  async remove(tenantId: string, id: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await this.findOne(tenantId, id);
    return tenantClient.supplier.update({
      where: { id, tenantId },
      data: { activo: false }
    });
  }
}
