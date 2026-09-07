import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { ReserveStockDto } from './dto/reserve-stock.dto.js';
import { ReleaseStockDto } from './dto/release-stock.dto.js';
import { MovementType } from '@prisma/client';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('inventory')
@UseGuards(RolesGuard)
@Roles('Admin', 'Gerente', 'Vendedor')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  private getTenantId(req: any): string {
    return req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000000';
  }

  private getUserId(req: any): string {
    // Para MVP, tomamos un usuario por defecto si no viene en el token real
    return req.user?.sub || '00000000-0000-0000-0000-000000000000';
  }

  @Post('movements')
  @HttpCode(201)
  createMovement(@Body() dto: CreateMovementDto, @Req() req: any) {
    return this.inventoryService.createMovement(this.getTenantId(req), this.getUserId(req), dto);
  }

  @Get('movements')
  getMovements(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('productId') productId?: string,
    @Query('tipo') tipo?: MovementType
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.inventoryService.getMovements(this.getTenantId(req), pageNum, limitNum, productId, tipo);
  }

  @Get('stock-summary')
  getStockSummary(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('stockBajo') stockBajo?: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const isStockBajo = stockBajo === 'true';
    return this.inventoryService.getStockSummary(this.getTenantId(req), pageNum, limitNum, search, categoriaId, isStockBajo);
  }

  @Get('stock/:productId')
  getStock(@Param('productId') productId: string, @Req() req: any) {
    return this.inventoryService.getStock(this.getTenantId(req), productId);
  }

  @Post('reserve')
  @HttpCode(201)
  reserveStock(@Body() dto: ReserveStockDto, @Req() req: any) {
    return this.inventoryService.reserveStock(this.getTenantId(req), this.getUserId(req), dto);
  }

  @Post('release')
  @HttpCode(200)
  releaseStock(@Body() dto: ReleaseStockDto, @Req() req: any) {
    return this.inventoryService.releaseStock(this.getTenantId(req), this.getUserId(req), dto);
  }
}
