import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { QuotesService } from './quotes.service.js';
import { CreateQuoteDto } from './dto/create-quote.dto.js';
import { UpdateQuoteDto } from './dto/update-quote.dto.js';
import { QuoteStatus } from '@prisma/client';
import type { Response } from 'express';

import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  private getTenantId(req: any): string {
    return req.headers['x-tenant-id'] || req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
  }

  @Post()
  @HttpCode(201)
  create(@Body() createQuoteDto: CreateQuoteDto, @Req() req: any) {
    return this.quotesService.create(this.getTenantId(req), createQuoteDto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('estado') estado?: QuoteStatus,
    @Query('clienteId') clienteId?: string,
    @Query('vendedorId') vendedorId?: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.quotesService.findAll(this.getTenantId(req), pageNum, limitNum, search, estado, clienteId, vendedorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.findOne(this.getTenantId(req), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto, @Req() req: any) {
    return this.quotesService.update(this.getTenantId(req), id, updateQuoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.remove(this.getTenantId(req), id);
  }

  @Post(':id/send')
  @HttpCode(200)
  send(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.changeStatus(this.getTenantId(req), id, QuoteStatus.ENVIADA);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.changeStatus(this.getTenantId(req), id, QuoteStatus.ACEPTADA);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.changeStatus(this.getTenantId(req), id, QuoteStatus.RECHAZADA);
  }

  @Post(':id/duplicate')
  @HttpCode(201)
  duplicate(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.duplicate(this.getTenantId(req), id);
  }

  @Post(':id/convert-to-order')
  @HttpCode(201)
  convertToOrder(@Param('id') id: string, @Req() req: any) {
    return this.quotesService.convertToOrder(this.getTenantId(req), id);
  }

  @Get(':id/pdf')
  async generatePdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const tenantId = this.getTenantId(req);
    const pdfBuffer = await this.quotesService.generatePdf(tenantId, id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Cotizacion-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }
}
