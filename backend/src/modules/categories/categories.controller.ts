import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';


import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('categories')
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente', 'Vendedor')

export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private getTenantId(req: any): string {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      throw new Error('x-tenant-id header is required');
    }
    return tenantId;
  }

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: any) {
    return this.categoriesService.create(createCategoryDto, this.getTenantId(req));
  }

  @Get()
  findAll(@Req() req: any) {
    return this.categoriesService.findAll(this.getTenantId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto, @Req() req: any) {
    return this.categoriesService.update(id, updateCategoryDto, this.getTenantId(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.remove(id, this.getTenantId(req));
  }
}
