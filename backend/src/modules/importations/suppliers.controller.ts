import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('suppliers')
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente', 'Vendedor')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Headers('x-tenant-id') tenantId: string, @Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(tenantId, createSupplierDto);
  }

  @Get()
  findAll(@Headers('x-tenant-id') tenantId: string) {
    return this.suppliersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.suppliersService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto
  ) {
    return this.suppliersService.update(tenantId, id, updateSupplierDto);
  }

  @Delete(':id')
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.suppliersService.remove(tenantId, id);
  }
}
