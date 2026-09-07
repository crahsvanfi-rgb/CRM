import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';


import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private getTenantId(req: any): string {
    return (
      req.headers['x-tenant-id'] ||
      req.user?.tenantId ||
      req.user?.user_metadata?.tenant_id ||
      '00000000-0000-0000-0000-000000000000'
    );
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
    return this.productsService.create(createProductDto, this.getTenantId(req));
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('estado') estado?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.productsService.findAll(this.getTenantId(req), pageNum, limitNum, search, categoriaId, estado);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.productsService.findOne(id, this.getTenantId(req));
  }

  @Get(':id/stock')
  getStock(@Param('id') id: string, @Req() req: any) {
    return this.productsService.getStock(id, this.getTenantId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @Req() req: any) {
    return this.productsService.update(id, updateProductDto, this.getTenantId(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.productsService.remove(id, this.getTenantId(req));
  }
}
