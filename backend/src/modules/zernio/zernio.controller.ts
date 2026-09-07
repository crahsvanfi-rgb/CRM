import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Headers,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ZernioService } from './zernio.service.js';
import { SendZernioMessageDto } from './dto/send-zernio-message.dto.js';
import { PublishZernioDto } from './dto/publish-zernio.dto.js';
import { ZernioConfigDto } from './dto/zernio-config.dto.js';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard.js';

@Controller(['zernio', 'api/zernio'])
export class ZernioController {
  private readonly logger = new Logger(ZernioController.name);

  constructor(private readonly zernioService: ZernioService) {}

  private extractTenantId(req: any, headerTenantId?: string, queryTenantId?: string): string {
    return (
      headerTenantId ||
      queryTenantId ||
      req?.headers?.['x-tenant-id'] ||
      req?.user?.tenantId ||
      req?.user?.app_metadata?.tenantId ||
      '00000000-0000-0000-0000-000000000000'
    );
  }

  // ----------------------------------------------------
  // ENPOINTS PROTEGIDOS: CONFIGURACIÓN
  // ----------------------------------------------------
  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig(
    @Req() req: any,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = this.extractTenantId(req, tenantHeader);
    return this.zernioService.getConfig(tenantId);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  async saveConfig(
    @Req() req: any,
    @Body() dto: ZernioConfigDto,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = this.extractTenantId(req, tenantHeader);
    return this.zernioService.updateConfig(tenantId, dto);
  }

  @Put('config')
  @UseGuards(JwtAuthGuard)
  async updateConfig(
    @Req() req: any,
    @Body() dto: ZernioConfigDto,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = this.extractTenantId(req, tenantHeader);
    return this.zernioService.updateConfig(tenantId, dto);
  }

  @Post('test-connection')
  @UseGuards(JwtAuthGuard)
  async testConnection(
    @Req() req: any,
    @Body() body: { apiKey?: string },
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = this.extractTenantId(req, tenantHeader);
    return this.zernioService.testConnection(tenantId, body?.apiKey);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  async testConnectionAlias(
    @Req() req: any,
    @Body() body: { apiKey?: string },
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = this.extractTenantId(req, tenantHeader);
    return this.zernioService.testConnection(tenantId, body?.apiKey);
  }

  // ----------------------------------------------------
  // ENPOINTS DE ENVÍO Y PUBLICACIÓN
  // ----------------------------------------------------
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Req() req: any,
    @Body() dto: SendZernioMessageDto,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = dto.tenantId || this.extractTenantId(req, tenantHeader);
    return this.zernioService.sendMessage(tenantId, dto, 'HUMANO');
  }

  @Post('publicar')
  @UseGuards(JwtAuthGuard)
  async publishContent(
    @Req() req: any,
    @Body() dto: PublishZernioDto,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = dto.tenantId || this.extractTenantId(req, tenantHeader);
    return this.zernioService.publishContent(tenantId, dto);
  }

  // ----------------------------------------------------
  // WEBHOOK (VERIFICACIÓN Y RECEPCIÓN)
  // ----------------------------------------------------
  @Get('webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Query('tenant_id') queryTenantId?: string,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Req() req?: any,
  ) {
    const tenantId = this.extractTenantId(req, headerTenantId, queryTenantId);
    return this.zernioService.verifyWebhook(mode, token, challenge, tenantId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-zernio-signature') signature?: string,
    @Query('tenant_id') queryTenantId?: string,
    @Req() req?: any,
  ) {
    const tenantId = this.extractTenantId(req, headerTenantId, queryTenantId || body?.tenantId);
    return this.zernioService.handleIncomingWebhook(tenantId, body, { signature });
  }
}
