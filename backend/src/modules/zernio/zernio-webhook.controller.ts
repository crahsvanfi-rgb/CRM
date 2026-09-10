import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Logger, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZernioService } from './zernio.service.js';

type WebhookHeaders = {
  signature?: string;
  event?: string;
  eventId?: string;
  tenantId?: string;
};

@Controller(['webhooks/cernio', 'webhooks/zernio', 'api/zernio-webhook'])
export class ZernioWebhookController {
  private readonly logger = new Logger(ZernioWebhookController.name);

  constructor(private readonly zernioService: ZernioService) {}


  @Get()
  @HttpCode(HttpStatus.OK)
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Query('tenant_id') queryTenantId?: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.zernioService.verifyWebhook(mode, token, challenge, tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  receiveWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Headers('x-zernio-signature') zernioSignature?: string,
    @Headers('x-late-signature') lateSignature?: string,
    @Headers('x-zernio-event') zernioEvent?: string,
    @Headers('x-zernio-event-id') zernioEventId?: string,
    @Headers('x-late-event-id') lateEventId?: string,
  ) {
    const headers: WebhookHeaders = {
      signature: zernioSignature || lateSignature,
      event: zernioEvent,
      eventId: zernioEventId || lateEventId,
      tenantId: tenantHeader,
    };

    this.zernioService.verifyIncomingWebhookSignature(req, body, headers);

    const tenantId = tenantHeader || body?.tenantId || body?.tenant_id;
    const event = zernioEvent || body?.event || 'unknown';

    if (event === 'webhook.test') {
      return { ok: true, received: true, event };
    }

    void this.zernioService.handleIncomingWebhook(tenantId, body, headers).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'error desconocido';
      this.logger.error(`Error procesando webhook Zernio en background: ${message}`);
    });

    return { ok: true, received: true, queued: true, event };
  }
}
