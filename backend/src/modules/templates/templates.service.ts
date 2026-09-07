import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto.js';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: CreateTemplateDto) {
    return this.prisma.campaignTemplate.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.campaignTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.campaignTemplate.findUnique({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Plantilla con ID ${id} no encontrada`);
    }

    return template;
  }

  async update(tenantId: string, id: string, data: UpdateTemplateDto) {
    await this.findOne(tenantId, id); // Verifica que existe

    return this.prisma.campaignTemplate.update({
      where: { id, tenantId },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // Verifica que existe

    return this.prisma.campaignTemplate.delete({
      where: { id, tenantId },
    });
  }

  async duplicate(tenantId: string, id: string) {
    const original = await this.findOne(tenantId, id);
    
    return this.prisma.campaignTemplate.create({
      data: {
        tenantId: original.tenantId,
        nombre: `${original.nombre} (Copia)`,
        cuerpo: original.cuerpo,
        categoria: original.categoria,
        activo: original.activo,
      }
    });
  }
}
