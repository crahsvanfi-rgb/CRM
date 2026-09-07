import { Controller, Get, Post, Req, Res, Headers, Query, Logger, UnauthorizedException } from '@nestjs/common';
import { ZeniorWebhookService } from './zenior-webhook.service.js';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Controller(['webhooks/zenior', 'webhooks/zernio', 'webhook/zernio', 'webhook/zenior'])
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class ZeniorWebhookController {
  private readonly logger = new Logger(ZeniorWebhookController.name);

  constructor(private readonly webhookService: ZeniorWebhookService) {}

  @Get()
  async verifyWebhook(@Query() query: any, @Res() res: Response) {
    // Meta Webhook Verification Flow (hub.challenge)
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const tenantId = query['tenant_id'];

    if (!tenantId) {
      return res.status(400).send('Missing tenant_id');
    }

    if (mode === 'subscribe' && token) {
      const isValid = await this.webhookService.verifyWebhookToken(tenantId, token);
      if (isValid) {
        this.logger.log('Webhook verificado exitosamente');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send('Forbidden');
      }
    }
    return res.status(400).send('Bad Request');
  }

  @Post()
  async receiveMessage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('tenant_id') queryTenantId: string,
    @Query('verify_token') queryToken: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Headers('x-hub-signature-256') signature: string,
    @Query('tenantId') queryTenantIdCamel?: string
  ) {
    const tenantId = queryTenantId || queryTenantIdCamel || headerTenantId || (req.body as any)?.tenantId || (req.body as any)?.tenant_id;
    
    if (!tenantId) {
      this.logger.error('No se proveyó tenantId en el webhook');
      return res.status(400).send('Missing tenant_id');
    }

    // Validación de seguridad (Fase 3.15)
    // Si hay token en la query, verificamos:
    if (queryToken) {
      const isValid = await this.webhookService.verifyWebhookToken(tenantId, queryToken);
      if (!isValid) return res.status(401).send('Unauthorized');
    } else if (signature) {
      // Implementación futura o básica de HMAC si se guardase el app secret. 
      // Por ahora, al menos exigiremos el verify_token para validar autenticidad si Zenior lo manda en la query.
      // Omitido para mantener compatibilidad si no manda firma.
    } else {
      // Si requerimos seguridad estricta, descomentar:
      // return res.status(401).send('Unauthorized: Falta token de verificación o firma');
    }

    // IMPORTANTE: Responder 200 inmediatamente tras validación para evitar reintentos
    res.status(200).send('EVENT_RECEIVED');

    // El procesamiento del mensaje se realiza de forma asíncrona en el background
    try {
      await this.webhookService.processIncomingEvent(tenantId, req.body);
    } catch (err: any) {
      this.logger.error(`Error procesando webhook de Zenior: ${err.message}`);
      return res.status(500).send('Error Interno');
    }
  }
}
