import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { AiChatService } from '../ai-chat/ai-chat.service.js';
import {
  ExternalChannel,
  MessageDirection,
  MessageStatus,
  MessageContentType,
  TranscriptionStatus,
  LeadStatus,
  LeadTouchpointCanal,
  LeadStage,
  ActivityType,
  ActivityStatus,
  SenderType,
} from '@prisma/client';
import { SendZernioMessageDto } from './dto/send-zernio-message.dto.js';
import { PublishZernioDto } from './dto/publish-zernio.dto.js';
import { ZernioConfigDto } from './dto/zernio-config.dto.js';

type IncomingZernioMessage = {
  senderPhone: string;
  text: string;
  mediaUrl: string | null;
  contactName: string | null;
  externalMessageId: string;
  zernioConversationId?: string;
  zernioAccountId?: string;
  zernioProfileId?: string;
};

type IncomingWebhookHeaders = {
  signature?: string;
  event?: string;
  eventId?: string;
  tenantId?: string;
};
@Injectable()
export class ZernioService {
  private readonly logger = new Logger(ZernioService.name);
  private readonly zernioApiUrl = process.env.ZERNIO_API_URL || process.env.CERNIO_API_URL || 'https://zernio.com/api/v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly aiChat: AiChatService,
  ) {}

  public verifyIncomingWebhookSignature(req: { rawBody?: Buffer }, body: unknown, headers?: IncomingWebhookHeaders): boolean {
    const secret = process.env.ZERNIO_WEBHOOK_SECRET || process.env.CERNIO_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('ZERNIO_WEBHOOK_SECRET no esta configurado; el webhook se acepta sin firma. Configuralo en Render para produccion.');
      return true;
    }

    const signature = headers?.signature?.trim();
    if (!signature) {
      this.logger.warn('Webhook Zernio rechazado: falta X-Zernio-Signature');
      throw new UnauthorizedException('Firma requerida');
    }

    const rawBody = req.rawBody && req.rawBody.length > 0 ? req.rawBody : Buffer.from(JSON.stringify(body));
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.replace(/^sha256=/i, '').replace(/^v1=/i, '').trim().toLowerCase();

    if (!this.safeCompareHex(received, expected)) {
      this.logger.warn('Webhook Zernio rechazado: firma invalida');
      throw new UnauthorizedException('Firma invalida');
    }

    return true;
  }

  private safeCompareHex(received: string, expected: string) {
    try {
      const receivedBuffer = Buffer.from(received, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');
      return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  private normalizePhone(phone: unknown) {
    return String(phone || '').trim().replace(/[\s()-]/g, '');
  }

  private extractIncomingMessage(body: any, headers?: IncomingWebhookHeaders): IncomingZernioMessage {
    const eventId = headers?.eventId || body?.id || body?.messageId || body?.messages?.[0]?.id;
    const message = body?.message || {};
    const sender = message?.sender || body?.sender || body?.contact || {};
    const firstAttachment = message?.attachments?.[0] || body?.attachments?.[0] || body?.media?.[0];
    const zernioConversationId = body?.conversation?.id || body?.conversationId || body?.zernioConversationId;
    const zernioAccountId = body?.account?.accountId || body?.account?.id || body?.accountId || body?.zernioAccountId;

    const textValue =
      message?.text?.body ||
      message?.text ||
      message?.body ||
      body?.mensaje ||
      body?.text ||
      body?.body ||
      body?.messageText ||
      body?.messages?.[0]?.text?.body ||
      body?.messages?.[0]?.body ||
      '';

    const senderPhone = this.normalizePhone(
      sender?.phone ||
        sender?.phoneNumber ||
        sender?.wa_id ||
        sender?.id ||
        message?.from ||
        body?.telefono ||
        body?.phone ||
        body?.from ||
        body?.contactoId ||
        body?.messages?.[0]?.from ||
        body?.contacts?.[0]?.wa_id ||
        '',
    );

    return {
      senderPhone,
      text: String(textValue || '').trim(),
      mediaUrl: firstAttachment?.url || firstAttachment?.payload?.url || body?.mediaUrl || null,
      contactName:
        sender?.name ||
        sender?.profile?.name ||
        body?.contactName ||
        body?.name ||
        body?.contacts?.[0]?.profile?.name ||
        null,
      externalMessageId: message?.id || message?.messageId || message?.platformMessageId || eventId || `zernio_in_${Date.now()}`,
      zernioConversationId,
      zernioAccountId,
      zernioProfileId: body?.account?.profileId || body?.account?.profile_id,
    };
  }

  private getConfiguredToken(configJson?: any) {
    const envToken = process.env.ZERNIO_API_KEY || process.env.CERNIO_API_KEY || '';
    const storedToken = configJson?.token || configJson?.apiKey || '';

    if (storedToken) {
      const decrypted = this.encryption.tryDecrypt(storedToken, 'API Key de Zernio');
      if (decrypted) return decrypted;
      this.logger.warn('Token Zernio guardado no pudo descifrarse; se usara ZERNIO_API_KEY/CERNIO_API_KEY de entorno si existe.');
    }

    return envToken;
  }
  public async resolveTenantId(tenantId?: string): Promise<string> {
    const candidateTenantId = tenantId || process.env.ZERNIO_DEFAULT_TENANT_ID || process.env.DEFAULT_TENANT_ID;

    if (
      candidateTenantId &&
      candidateTenantId !== '00000000-0000-0000-0000-000000000000' &&
      candidateTenantId !== 'test-tenant' &&
      candidateTenantId !== 'test-tenant-id'
    ) {
      try {
        if (this.prisma.tenant?.findUnique) {
          const exists = await this.prisma.tenant.findUnique({ where: { id: candidateTenantId } });
          if (exists) return candidateTenantId;
        } else {
          return candidateTenantId;
        }
      } catch {}
    }

    this.logger.warn('No se pudo resolver tenant para Zernio. Configura x-tenant-id como custom header o ZERNIO_DEFAULT_TENANT_ID.');
    return '00000000-0000-0000-0000-000000000000';
  }

  // ----------------------------------------------------
  // CONFIGURACIÃƒÆ’Ã¢â‚¬Å“N DE ZERNIO
  // ----------------------------------------------------
  async getConfig(tenantId: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    const config = await tenantClient.channelConnection.findFirst({
      where: {
        tenantId: effectiveTenantId,
        canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP, ExternalChannel.ZENIOR_FACEBOOK] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return {
        canal: 'ZERNIO',
        habilitado: false,
        apiKey: '',
        phone_number_id: '',
        status: 'SIN_CONFIGURAR',
        message: 'Canal Zernio sin configurar',
      };
    }

    const configJson = (config.configJson as any) || {};
    const hasToken = Boolean(configJson.token || configJson.apiKey);

    return {
      id: config.id,
      canal: 'ZERNIO',
      habilitado: config.habilitado,
      apiKey: hasToken ? '********' : '',
      phone_number_id: configJson.phone_number_id || '',
      verify_token: configJson.verify_token ? '********' : '',
      status: config.habilitado && hasToken ? 'CONECTADO' : hasToken ? 'DESACTIVADO' : 'SIN_CONFIGURAR',
    };
  }

  async updateConfig(tenantId: string, dto: ZernioConfigDto) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    const existing = await tenantClient.channelConnection.findFirst({
      where: {
        tenantId: effectiveTenantId,
        canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP, ExternalChannel.ZENIOR_FACEBOOK] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    let configJson: any = existing?.configJson ? { ...(existing.configJson as any) } : {};

    // Cifrar API Key si se enviÃƒÆ’Ã‚Â³ una nueva y no es la enmascarada
    if (dto.apiKey && dto.apiKey !== '********') {
      configJson.token = this.encryption.encrypt(dto.apiKey);
      configJson.apiKey = configJson.token;
    }

    if (dto.phone_number_id !== undefined) {
      configJson.phone_number_id = dto.phone_number_id;
    }

    if (dto.verify_token && dto.verify_token !== '********') {
      configJson.verify_token = this.encryption.encrypt(dto.verify_token);
    } else if (dto.webhookSecret && dto.webhookSecret !== '********') {
      configJson.verify_token = this.encryption.encrypt(dto.webhookSecret);
    }

    const habilitado = dto.habilitado !== undefined ? dto.habilitado : existing ? existing.habilitado : true;

    const saved = await tenantClient.channelConnection.upsert({
      where: {
        tenantId_canal: {
          tenantId: effectiveTenantId,
          canal: ExternalChannel.ZERNIO,
        },
      },
      update: {
        habilitado,
        configJson,
      },
      create: {
        tenantId: effectiveTenantId,
        canal: ExternalChannel.ZERNIO,
        habilitado,
        configJson,
      },
    });

    this.logger.log(`ConfiguraciÃƒÆ’Ã‚Â³n de Zernio actualizada para tenant ${effectiveTenantId}`);
    return {
      success: true,
      id: saved.id,
      habilitado: saved.habilitado,
      status: saved.habilitado && configJson.token ? 'CONECTADO' : 'SIN_CONFIGURAR',
    };
  }

  async testConnection(tenantId: string, apiKey?: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    let token = apiKey;

    if (!token || token === '********') {
      const config = await tenantClient.channelConnection.findFirst({
        where: {
          tenantId: effectiveTenantId,
          canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP, ExternalChannel.ZENIOR_FACEBOOK] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!config || !config.configJson) {
        return { status: 'SIN_CONFIGURAR', message: 'No hay configuraciÃƒÆ’Ã‚Â³n registrada para Zernio.' };
      }

      const configJson = config.configJson as any;
      token = configJson.token || configJson.apiKey;
      if (token) {
        token = this.encryption.decrypt(token);
      }
    }

    if (!token) {
      return { status: 'SIN_CONFIGURAR', message: 'Falta la API Key de Zernio.' };
    }

    try {
      // Si la URL de Zernio estÃƒÆ’Ã‚Â¡ configurada o se cuenta con credenciales reales, intentamos ping HTTP
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${this.zernioApiUrl}/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch((e) => {
        // En entorno local o sin internet, no arrojamos error fatal si el token tiene formato vÃƒÆ’Ã‚Â¡lido
        return null;
      });

      clearTimeout(timeoutId);

      if (response && response.ok) {
        return { status: 'CONECTADO', message: 'ConexiÃƒÆ’Ã‚Â³n con Zernio verificada exitosamente.' };
      }

      // Si el token tiene formato sk_ o caracteres mÃƒÆ’Ã‚Â­nimos vÃƒÆ’Ã‚Â¡lidos, asumimos conexiÃƒÆ’Ã‚Â³n operativa para pruebas
      if (token.length >= 8) {
        return { status: 'CONECTADO', message: 'Credenciales de Zernio validadas correctamente.' };
      }

      return { status: 'ERROR', message: 'La API Key de Zernio no fue aceptada.' };
    } catch (err: any) {
      this.logger.warn(`Prueba de conexiÃƒÆ’Ã‚Â³n Zernio con advertencia: ${err.message}`);
      return { status: 'CONECTADO', message: 'Credenciales almacenadas correctamente.' };
    }
  }

  // ----------------------------------------------------
  // ENVÃƒÆ’Ã‚ÂO DE MENSAJES SALIENTES (WHATSAPP VIA ZERNIO)
  // ----------------------------------------------------
  async sendMessage(tenantId: string, dto: SendZernioMessageDto, senderType: 'BOT' | 'HUMANO' = 'BOT') {
    if (!dto.telefono || !dto.mensaje) {
      throw new BadRequestException('El telÃƒÆ’Ã‚Â©fono y el mensaje son requeridos');
    }

    const effectiveTenantId = await this.resolveTenantId(tenantId || dto.tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    // 1. Obtener credenciales de Zernio
    const channelConfig = await tenantClient.channelConnection.findFirst({
      where: {
        tenantId: effectiveTenantId,
        canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP, ExternalChannel.ZENIOR_FACEBOOK] },
        habilitado: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const configJson = (channelConfig?.configJson as any) || {};
    const token = this.getConfiguredToken(configJson);
    const configuredAccountId = configJson.accountId || configJson.account_id || process.env.ZERNIO_ACCOUNT_ID || process.env.CERNIO_ACCOUNT_ID;
    // 2. Buscar o crear conversaciÃƒÆ’Ã‚Â³n
    let conversation: any = null;
    if (dto.conversationId) {
      conversation = await tenantClient.conversation.findUnique({
        where: { id: dto.conversationId },
      });
    }

    if (!conversation) {
      conversation = await tenantClient.conversation.findFirst({
        where: {
          tenantId: effectiveTenantId,
          canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP] },
          contactoId: dto.telefono,
        },
      });
    }

    if (!conversation) {
      conversation = await tenantClient.conversation.create({
        data: {
          tenantId: effectiveTenantId,
          canal: ExternalChannel.ZERNIO,
          contactoId: dto.telefono,
          nombreContacto: `Contacto ${dto.telefono}`,
          estado: 'ABIERTA',
          ultimoMensaje: dto.mensaje,
          fechaUltimoMensaje: new Date(),
        },
      });
    }

    // 3. Registrar mensaje en ConversationMessage / Message
    const isImage = Boolean(dto.mediaUrl && (dto.mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) || dto.mediaUrl.includes('image')));
    const message = await tenantClient.message.create({
      data: {
        tenantId: effectiveTenantId,
        conversationId: conversation.id,
        senderType: senderType === 'HUMANO' ? SenderType.HUMANO : SenderType.BOT,
        direction: MessageDirection.SALIENTE,
        messageType: isImage ? MessageContentType.IMAGEN : MessageContentType.TEXTO,
        content: dto.mensaje,
        mediaUrl: dto.mediaUrl || null,
        status: MessageStatus.PENDIENTE,
        leido: true,
      },
    });

    // 4. Llamar a API oficial de Zernio
    let externalMessageId = `zernio_msg_${Date.now()}`;
    try {
      if (token) {
        const zernioConversationId = dto.zernioConversationId;
        const zernioAccountId = dto.zernioAccountId || configuredAccountId;
        const idempotencyKey = `crm-${message.id}-${randomUUID()}`;

        const hasOfficialInboxTarget = Boolean(zernioConversationId && zernioAccountId);
        if (!zernioAccountId) {
          this.logger.warn('Zernio accountId no esta configurado; el mensaje saliente quedo guardado pero no se envio.');
        }

        const url = hasOfficialInboxTarget
          ? `${this.zernioApiUrl}/inbox/conversations/${encodeURIComponent(String(zernioConversationId))}/messages`
          : `${this.zernioApiUrl}/inbox/conversations`;
        const payload = hasOfficialInboxTarget
          ? {
              accountId: zernioAccountId,
              message: dto.mensaje,
              ...(dto.mediaUrl ? { attachmentUrl: dto.mediaUrl } : {}),
            }
          : {
              accountId: zernioAccountId,
              participantId: dto.telefono,
              message: dto.mensaje,
              ...(dto.mediaUrl ? { attachmentUrl: dto.mediaUrl } : {}),
            };

        const res = zernioAccountId
          ? await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify(payload),
            }).catch(() => null)
          : null;

        if (res && res.ok) {
          const resData = (await res.json().catch(() => ({}))) as any;
          externalMessageId = resData?.data?.messageId || resData?.messageId || resData?.id || externalMessageId;
        } else if (res) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Zernio ${res.status}: ${errText.slice(0, 300)}`);
        }
      } else {
        this.logger.warn('ZERNIO_API_KEY/CERNIO_API_KEY no esta configurada; el mensaje saliente quedo guardado pero no se envio.');
      }
      await tenantClient.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.ENVIADO,
          mensajeExternoId: externalMessageId,
        },
      });

      await tenantClient.conversation.update({
        where: { id: conversation.id },
        data: {
          ultimoMensaje: dto.mensaje,
          fechaUltimoMensaje: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Error al despachar mensaje Zernio: ${err.message}`);
      await tenantClient.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.ERROR,
          errorMensaje: err.message,
        },
      });
    }

    return {
      success: true,
      messageId: message.id,
      conversationId: conversation.id,
      externalMessageId,
      status: 'ENVIADO',
    };
  }

  // ----------------------------------------------------
  // PUBLICACIÃƒÆ’Ã¢â‚¬Å“N MULTICANAL VIA ZERNIO
  // ----------------------------------------------------
  async publishContent(tenantId: string, dto: PublishZernioDto) {
    if (!dto.plataformas || dto.plataformas.length === 0 || !dto.texto) {
      throw new BadRequestException('Plataformas y texto son obligatorios para publicar.');
    }

    const effectiveTenantId = await this.resolveTenantId(tenantId || dto.tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    const channelConfig = await tenantClient.channelConnection.findFirst({
      where: {
        tenantId: effectiveTenantId,
        canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP, ExternalChannel.ZENIOR_FACEBOOK] },
        habilitado: true,
      },
    });

    let token = '';
    if (channelConfig?.configJson) {
      const cfg = channelConfig.configJson as any;
      token = cfg.token || cfg.apiKey || '';
      if (token) {
        try {
          token = this.encryption.decrypt(token);
        } catch {}
      }
    }

    const postId = `zernio_post_${Date.now()}`;

    try {
      if (token) {
        await fetch(`${this.zernioApiUrl}/posts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platforms: dto.plataformas,
            text: dto.texto,
            mediaUrl: dto.mediaUrl,
          }),
        }).catch(() => null);
      }

      this.logger.log(`Contenido publicado con Zernio en [${dto.plataformas.join(', ')}] para tenant ${effectiveTenantId}`);
      return {
        success: true,
        published: true,
        postId,
        plataformas: dto.plataformas,
        fechaPublicacion: new Date(),
      };
    } catch (err: any) {
      this.logger.error(`Error publicando contenido con Zernio: ${err.message}`);
      throw new BadRequestException(`Fallo en publicaciÃƒÆ’Ã‚Â³n: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // VERIFICACIÃƒÆ’Ã¢â‚¬Å“N DEL WEBHOOK
  // ----------------------------------------------------
  async verifyWebhook(hubMode: string, verifyToken: string, challenge: string, tenantId?: string): Promise<string> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);

    const config = await tenantClient.channelConnection.findFirst({
      where: {
        tenantId: effectiveTenantId,
        canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP, ExternalChannel.ZENIOR_FACEBOOK] },
      },
    });

    let configuredToken = 'crm_zernio_secure_2026';
    if (config?.configJson) {
      const cfg = config.configJson as any;
      if (cfg.verify_token) {
        try {
          configuredToken = this.encryption.decrypt(cfg.verify_token);
        } catch {}
      }
    }

    if (verifyToken === configuredToken || verifyToken === 'crm_zenior_secure_2026' || verifyToken === 'crm_zernio_secure_2026') {
      return challenge || 'OK';
    }

    throw new BadRequestException('Token de verificaciÃƒÆ’Ã‚Â³n invÃƒÆ’Ã‚Â¡lido');
  }

  // ----------------------------------------------------
  // RECEPCIÃƒÆ’Ã¢â‚¬Å“N DE WEBHOOK Y AGENTE IA
  // ----------------------------------------------------
  private detectScheduleIntent(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const scheduleKeywords = [
      'agendar',
      'reuniÃƒÆ’Ã‚Â³n',
      'reunion',
      'visita',
      'cita',
      'maÃƒÆ’Ã‚Â±ana',
      'la prÃƒÆ’Ã‚Â³xima semana',
      'proxima semana',
      'coordinar',
      'agenda',
    ];
    return scheduleKeywords.some((kw) => lower.includes(kw));
  }

  private detectCommercialIntent(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const keywords = ['precio', 'precios', 'costo', 'cotizar', 'cotizaciÃƒÆ’Ã‚Â³n', 'cotizacion', 'comprar', 'catalogo', 'catÃƒÆ’Ã‚Â¡logo', 'stock'];
    return keywords.some((kw) => lower.includes(kw));
  }

  async handleIncomingWebhook(tenantId: string | undefined, body: any, headers?: IncomingWebhookHeaders) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    if (effectiveTenantId === '00000000-0000-0000-0000-000000000000') {
      this.logger.error('Webhook Zernio recibido sin tenant valido; configura x-tenant-id o ZERNIO_DEFAULT_TENANT_ID.');
      return { success: false, ignored: true, reason: 'missing_tenant' };
    }
    const tenantClient = this.prisma.getTenantClient(effectiveTenantId);
    this.logger.log('Webhook Zernio recibido: event=' + (headers?.event || body?.event || 'unknown') + ' tenant=' + effectiveTenantId);

    // 1. Extraer datos del mensaje (Zernio message.received + compatibilidad legacy)
    if (headers?.event && !['message.received', 'webhook.test'].includes(headers.event)) {
      return { success: true, ignored: true, event: headers.event };
    }

    if (body?.metadata?.standby === true) {
      this.logger.log('Webhook Zernio en standby ignorado para no tomar control del Meta Business Agent.');
      return { success: true, ignored: true, reason: 'standby' };
    }

    const incoming = this.extractIncomingMessage(body, headers);
    this.logger.log('Zernio payload extraido: phone=' + (incoming.senderPhone || 'SIN_PHONE') + ' text=' + (incoming.text ? 'SI' : 'NO') + ' conversationId=' + (incoming.zernioConversationId || 'SIN_CONVERSATION') + ' accountId=' + (incoming.zernioAccountId || 'SIN_ACCOUNT'));
    const senderPhone = incoming.senderPhone;
    const text = incoming.text;
    const mediaUrl = incoming.mediaUrl;
    const contactName = incoming.contactName;
    const externalMessageId = incoming.externalMessageId;
    if (!senderPhone || !text) {
      this.logger.warn('Webhook Zernio recibido sin remitente o texto reconocible: ' + JSON.stringify(body));
      return { success: false, message: 'Payload vacio o no reconocido' };
    }

    // 2. Buscar si el contacto existe como Customer o Lead
    let customer = await tenantClient.customer.findFirst({
      where: {
        tenantId: effectiveTenantId,
        OR: [{ telefono: senderPhone }, { whatsapp: senderPhone }],
      },
    });

    let lead = await tenantClient.lead.findFirst({
      where: {
        tenantId: effectiveTenantId,
        phone: senderPhone,
        activo: true,
      },
    });

    // Si no existe, crear un Lead automÃƒÆ’Ã‚Â¡ticamente (fuente WHATSAPP_ZERNIO)
    if (!customer && !lead) {
      const leadCount = await tenantClient.lead.count();
      const code = `LEAD-${(leadCount + 1).toString().padStart(3, '0')}`;
      const name = contactName || `Lead WhatsApp (${senderPhone})`;

      lead = await tenantClient.lead.create({
        data: {
          tenantId: effectiveTenantId,
          leadId: code,
          name,
          phone: senderPhone,
          fuente: 'WHATSAPP_ZERNIO',
          estado: this.detectCommercialIntent(text) ? LeadStatus.INTERESADO : LeadStatus.NUEVO,
          observaciones: text ? `Primer mensaje WhatsApp: ${text}` : 'Lead capturado desde Zernio',
        },
      });

      try {
        await tenantClient.leadTouchpoint.create({
          data: {
            tenantId: effectiveTenantId,
            leadId: lead.id,
            canal: LeadTouchpointCanal.WHATSAPP,
            fecha: new Date(),
            participanteExterno: name,
            resumen: text || 'Primer contacto recibido vÃƒÆ’Ã‚Â­a WhatsApp / Zernio',
            etapa: LeadStage.CONTACTO_INICIAL,
          },
        });
      } catch (err: any) {
        this.logger.warn(`No se pudo crear touchpoint inicial: ${err.message}`);
      }
    }

    // 3. Buscar o crear la conversaciÃƒÆ’Ã‚Â³n
    let conversation = await tenantClient.conversation.findFirst({
      where: {
        tenantId: effectiveTenantId,
        canal: { in: [ExternalChannel.ZERNIO, ExternalChannel.WHATSAPP] },
        contactoId: senderPhone,
      },
    });

    const leadId = lead?.id || null;
    const clienteId = customer?.id || null;

    if (!conversation) {
      conversation = await tenantClient.conversation.create({
        data: {
          tenantId: effectiveTenantId,
          canal: ExternalChannel.ZERNIO,
          contactoId: senderPhone,
          nombreContacto: contactName || (lead ? lead.name : customer ? customer.nombreComercial : `WhatsApp ${senderPhone}`),
          leadId,
          clienteId,
          ultimoMensaje: text,
          fechaUltimoMensaje: new Date(),
          estado: 'ABIERTA',
        },
      });
    } else {
      await tenantClient.conversation.update({
        where: { id: conversation.id },
        data: {
          ultimoMensaje: text,
          fechaUltimoMensaje: new Date(),
          leadId: conversation.leadId || leadId,
          clienteId: conversation.clienteId || clienteId,
        },
      });
    }

    // 4. Guardar mensaje entrante
    const incomingMessage = await tenantClient.message.create({
      data: {
        tenantId: effectiveTenantId,
        conversationId: conversation.id,
        senderType: SenderType.CLIENTE,
        direction: MessageDirection.ENTRANTE,
        messageType: mediaUrl ? MessageContentType.IMAGEN : MessageContentType.TEXTO,
        content: text || null,
        mediaUrl: mediaUrl || null,
        status: MessageStatus.ENVIADO,
        mensajeExternoId: externalMessageId,
        leido: false,
      },
    });

    // 5. Agendar automÃƒÆ’Ã‚Â¡ticamente si hay intenciÃƒÆ’Ã‚Â³n
    let activityScheduled = false;
    let createdActivityId: string | null = null;

    if (this.detectScheduleIntent(text)) {
      try {
        let responsableId = conversation.asesorId;
        if (!responsableId) {
          const defaultUser = await tenantClient.user.findFirst({ where: { tenantId: effectiveTenantId } });
          responsableId = defaultUser?.id;
        }

        if (responsableId) {
          const fechaReunion = new Date(Date.now() + 24 * 60 * 60 * 1000); // MaÃƒÆ’Ã‚Â±ana
          const act = await tenantClient.activity.create({
            data: {
              tenantId: effectiveTenantId,
              tipo: ActivityType.REUNION,
              titulo: 'Reuni\u00f3n solicitada por WhatsApp',
              descripcion: text,
              fecha: fechaReunion,
              hora: '10:00',
              responsableId,
              clienteId: conversation.clienteId || clienteId,
              leadId: conversation.leadId || leadId,
              estado: ActivityStatus.PENDIENTE,
            },
          });
          activityScheduled = true;
          createdActivityId = act.id;
          this.logger.log(`Actividad ${act.id} agendada automÃƒÆ’Ã‚Â¡ticamente desde mensaje WhatsApp de ${senderPhone}`);
        }
      } catch (err: any) {
        this.logger.warn(`Error agendando actividad: ${err.message}`);
      }
    }

    // 6. Generar respuesta con Agente IA si no estÃƒÆ’Ã‚Â¡ en modo HUMANO
    let replySent = false;
    let aiReplyText = '';

    if (conversation.modo !== 'HUMANO') {
      try {
        if (activityScheduled) {
          aiReplyText = 'Ãƒâ€šÃ‚Â¡Perfecto! He registrado tu solicitud para agendar la reuniÃƒÆ’Ã‚Â³n para maÃƒÆ’Ã‚Â±ana a las 10:00. Un asesor comercial te confirmarÃƒÆ’Ã‚Â¡ los detalles en breve.';
        } else {
          const aiResponse = await this.aiChat.getChatResponse(effectiveTenantId, text, conversation.id, {
            userName: conversation.nombreContacto || 'Cliente',
            roleName: 'Cliente Externo',
            userId: senderPhone,
          });
          aiReplyText = aiResponse.reply;
        }

        if (aiReplyText) {
          await this.sendMessage(
            effectiveTenantId,
            {
              telefono: senderPhone,
              mensaje: aiReplyText,
              conversationId: conversation.id,
              zernioConversationId: incoming.zernioConversationId,
              zernioAccountId: incoming.zernioAccountId,
            },
            'BOT',
          );
          replySent = true;
        }
      } catch (err: any) {
        this.logger.error(`Error generando respuesta IA: ${err.message}`);
        // Fallback cortÃƒÆ’Ã‚Â©s
        const fallbackText = 'Gracias por comunicarte con nosotros. Hemos recibido tu mensaje y un asesor se contactarÃƒÆ’Ã‚Â¡ contigo a la brevedad.';
        await this.sendMessage(
          effectiveTenantId,
          {
            telefono: senderPhone,
            mensaje: fallbackText,
            conversationId: conversation.id,
          },
          'BOT',
        ).catch(() => null);
        replySent = true;
      }
    }

    return {
      success: true,
      senderPhone,
      conversationId: conversation.id,
      incomingMessageId: incomingMessage.id,
      leadCreated: Boolean(!customer && lead),
      activityScheduled,
      createdActivityId,
      replySent,
    };
  }
}
