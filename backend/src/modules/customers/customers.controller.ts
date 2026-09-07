import { Controller, Get, Post, Body, Patch, Param, Delete, Req, HttpCode, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CreateCustomerNoteDto } from './dto/create-note.dto.js';
import { CreateCustomerActivityDto } from './dto/create-customer-activity.dto.js';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller(['customers', 'api/customers'])
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  private getTenantId(req: any): string {
    return (
      req.headers['x-tenant-id'] ||
      req.user?.tenantId ||
      req.user?.user_metadata?.tenant_id ||
      '00000000-0000-0000-0000-000000000000'
    );
  }

  private getUserId(req: any): string {
    return (
      req.headers['x-user-id'] ||
      req.user?.id ||
      req.user?.sub ||
      '00000000-0000-0000-0000-000000000000'
    );
  }

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto, @Req() req: any) {
    return this.customersService.create(createCustomerDto, this.getTenantId(req));
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('tipoCliente') tipoCliente: string,
    @Query('estado') estado: string,
    @Query('vendedorId') vendedorId: string,
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.customersService.findAll(this.getTenantId(req), pageNum, limitNum, search, tipoCliente, estado, vendedorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.customersService.findOne(id, this.getTenantId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto, @Req() req: any) {
    return this.customersService.update(id, updateCustomerDto, this.getTenantId(req));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.customersService.remove(id, this.getTenantId(req));
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() noteDto: CreateCustomerNoteDto, @Req() req: any) {
    return this.customersService.addNote(id, noteDto, this.getTenantId(req), this.getUserId(req));
  }

  @Get(':id/notes')
  getNotes(@Param('id') id: string, @Req() req: any) {
    // Already included in findOne, but exposing just in case
    return this.customersService.findOne(id, this.getTenantId(req)).then(c => c.notes);
  }

  @Post(':id/activities')
  addActivity(@Param('id') id: string, @Body() activityDto: CreateCustomerActivityDto, @Req() req: any) {
    return this.customersService.addActivity(id, activityDto, this.getTenantId(req), this.getUserId(req));
  }
}
