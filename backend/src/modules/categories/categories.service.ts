import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.category.create({
      data: {
        ...createCategoryDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    return tenantClient.category.findMany({
      where: {
        tenantId,
        activo: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    const existing = await tenantClient.category.findUnique({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Category con ID ${id} no encontrada`);
    }

    return tenantClient.category.update({
      where: { id, tenantId },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, tenantId: string) {
    return this.update(id, { activo: false }, tenantId);
  }
}
