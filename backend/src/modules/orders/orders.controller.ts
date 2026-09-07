import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Res, BadRequestException, HttpCode, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { OrderStatus } from '@prisma/client';
import type { Response } from 'express';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('orders')
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente', 'Vendedor')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private getTenantId(req: any): string {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }
    return tenantId;
  }

  private getUserId(req: any): string {
    return req.headers['x-user-id'] || req.user?.sub || '00000000-0000-0000-0000-000000000000';
  }

  @Post()
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    const tenantId = this.getTenantId(req);
    return this.ordersService.create(tenantId, createOrderDto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('estado') estado?: OrderStatus,
    @Query('clienteId') clienteId?: string,
    @Query('vendedorId') vendedorId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    const tenantId = this.getTenantId(req);
    return this.ordersService.findAll(tenantId, +page, +limit, search, estado, clienteId, vendedorId, fechaInicio, fechaFin);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.ordersService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    const tenantId = this.getTenantId(req);
    return this.ordersService.update(tenantId, id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.ordersService.remove(tenantId, id);
  }

  @Post(':id/confirm')
  confirm(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.ordersService.confirm(tenantId, userId, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.ordersService.cancel(tenantId, userId, id);
  }

  @Post(':id/deliver')
  deliver(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.ordersService.deliver(tenantId, userId, id);
  }

  @Get(':id/pdf')
  async getPdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const tenantId = this.getTenantId(req);
    const pdfBuffer = await this.ordersService.generatePdf(tenantId, id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=pedido-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }
}

