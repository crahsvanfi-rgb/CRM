import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post, Req, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

type ZernioPayload = {
  message?: { text?: { body?: string } };
  contact?: { wa_id?: string; phone?: string };
  messages?: Array<{ from?: string; text?: { body?: string }; body?: string }>;
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  from?: string;
  phone?: string;
  text?: string;
};

type SupabaseUser = {
  id?: string;
  phone?: string;
  name?: string | null;
  email?: string | null;
};

@Controller('api/zernio-webhook')
export class ZernioWebhookController {
  private readonly logger = new Logger(ZernioWebhookController.name);

  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: ZernioPayload,
    @Headers('x-zernio-signature') signature?: string,
  ) {
    this.verifySignature(req, body, signature);

    const incomingMessage = this.extractMessage(body);
    const phone = this.extractPhone(body);

    if (!incomingMessage || !phone) {
      this.logger.warn('Webhook Zernio recibido sin message.text.body o contact.wa_id');
      return { ok: true, received: true, ignored: true };
    }

    this.logger.log(`Webhook Zernio recibido de ${this.maskPhone(phone)}`);

    const user = await this.findUserByPhone(phone);
    const response = this.buildChatbotResponse(incomingMessage, user);

    try {
      await this.saveConversation(phone, incomingMessage, response);
    } catch (error) {
      this.logger.error(`No se pudo guardar conversación en Supabase: ${this.errorMessage(error)}`);
    }

    try {
      await this.sendZernioMessage(phone, response);
    } catch (error) {
      this.logger.error(`No se pudo enviar respuesta por Zernio: ${this.errorMessage(error)}`);
    }

    return { ok: true, received: true };
  }

  private verifySignature(req: Request & { rawBody?: Buffer }, body: ZernioPayload, signature?: string) {
    const secret = process.env.ZERNIO_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('ZERNIO_WEBHOOK_SECRET no está configurado');
      throw new UnauthorizedException('Webhook secret no configurado');
    }
    if (!signature) {
      this.logger.warn('Webhook Zernio rechazado: falta X-Zernio-Signature');
      throw new UnauthorizedException('Firma requerida');
    }

    const rawBody = req.rawBody && req.rawBody.length > 0 ? req.rawBody : Buffer.from(JSON.stringify(body));
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.replace(/^sha256=/i, '').replace(/^v1=/i, '').trim();

    if (!this.safeCompare(received, expectedHex)) {
      this.logger.warn('Webhook Zernio rechazado: firma inválida');
      throw new UnauthorizedException('Firma inválida');
    }
  }

  private safeCompare(received: string, expected: string) {
    try {
      const receivedBuffer = Buffer.from(received, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');
      return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  private extractMessage(body: ZernioPayload) {
    return (
      body.message?.text?.body ||
      body.messages?.[0]?.text?.body ||
      body.messages?.[0]?.body ||
      body.text ||
      ''
    ).trim();
  }

  private extractPhone(body: ZernioPayload) {
    return (
      body.contact?.wa_id ||
      body.contact?.phone ||
      body.contacts?.[0]?.wa_id ||
      body.messages?.[0]?.from ||
      body.from ||
      body.phone ||
      ''
    ).replace(/\D/g, '');
  }

  private buildChatbotResponse(message: string, user?: SupabaseUser | null) {
    const lower = message.toLowerCase();
    const greeting = user?.name ? `Hola ${user.name}` : 'Hola';

    if (this.includesAny(lower, ['hola', 'buenas', 'buen día', 'buenas tardes', 'buenas noches'])) {
      return `${greeting}, gracias por escribir a XPANDEZ. Soy el asistente virtual. ¿Buscas precios, una cotización o quieres agendar una cita?`;
    }
    if (this.includesAny(lower, ['precio', 'precios', 'costo', 'cuánto', 'cuanto', 'cotizar', 'cotización', 'cotizacion'])) {
      return 'Con gusto te ayudamos con precios y cotizaciones. Envíanos el producto, cantidad y ciudad de entrega para prepararte una propuesta.';
    }
    if (this.includesAny(lower, ['cita', 'reunión', 'reunion', 'agenda', 'agendar', 'visita'])) {
      return 'Claro, podemos coordinar una cita. Indícanos el día y horario que prefieres, y un asesor comercial te confirmará la disponibilidad.';
    }

    return 'Gracias por tu mensaje. Lo recibimos correctamente y un asesor comercial te responderá en breve.';
  }

  private includesAny(text: string, words: string[]) {
    return words.some((word) => text.includes(word));
  }

  private async findUserByPhone(phone: string): Promise<SupabaseUser | null> {
    try {
      const data = await this.supabaseRequest<SupabaseUser[]>(`/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id,phone,name,email&limit=1`);
      return data[0] || null;
    } catch (error) {
      this.logger.warn(`No se pudo buscar usuario por teléfono: ${this.errorMessage(error)}`);
      return null;
    }
  }

  private async saveConversation(phone: string, message: string, response: string) {
    await this.supabaseRequest('/rest/v1/conversations', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        phone,
        message,
        response,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  private async sendZernioMessage(phone: string, text: string) {
    const apiKey = process.env.ZERNIO_API_KEY;
    if (!apiKey) {
      this.logger.error('ZERNIO_API_KEY no está configurada; no se envió respuesta automática');
      return;
    }

    const res = await fetch('https://zernio.com/api/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: phone, text }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`Zernio respondió ${res.status}: ${errText.slice(0, 300)}`);
      throw new Error('No se pudo enviar el mensaje por Zernio');
    }
  }

  private async supabaseRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('SUPABASE_URL o SUPABASE_ANON_KEY no están configuradas');
    }

    const res = await fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? JSON.parse(text) as T : undefined as T;
  }

  private maskPhone(phone: string) {
    if (phone.length <= 4) return '****';
    return `${'*'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'error desconocido';
  }
}
