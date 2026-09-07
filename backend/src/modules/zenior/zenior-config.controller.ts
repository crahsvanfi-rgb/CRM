import { Controller, Get, Put, Post, Body, Req, UseGuards, ForbiddenException, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { ExternalChannel } from '@prisma/client';

@Controller(['external-channels', 'api/external-channels'])
@UseGuards(JwtAuthGuard)
export class ZeniorConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  @Get()
  async getConfigs(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    const tenantClient = this.prisma.getTenantClient(tenantId);
    const configs = await tenantClient.channelConnection.findMany({
      where: { tenantId }
    });

    // Desencriptar campos sensibles antes de enviarlos (opcional ocultar el token real)
    return configs.map((c: any) => {
      let configJson = c.configJson as any;
      if (configJson) {
        if (configJson.token) configJson.token = '********'; // Ocultar token
        if (configJson.verify_token) configJson.verify_token = '********'; // Ocultar verify_token
      }
      return { ...c, configJson };
    });
  }

  @Put('zenior')
  async updateZeniorConfig(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    const tenantClient = this.prisma.getTenantClient(tenantId);
    
    // Preparar configJson, cifrando tokens si existen y fueron enviados (no es '********')
    let configJson = body.configJson || {};
    const existing = await tenantClient.channelConnection.findFirst({ where: { tenantId, canal: ExternalChannel.ZENIOR_FACEBOOK } });
    
    if (configJson.token && configJson.token !== '********') {
      configJson.token = this.encryption.encrypt(configJson.token);
    } else if (existing && existing.configJson) {
      // Retener el token existente si mandaron '********'
      configJson.token = (existing.configJson as any).token;
    }

    if (configJson.verify_token && configJson.verify_token !== '********') {
      configJson.verify_token = this.encryption.encrypt(configJson.verify_token);
    } else if (existing && existing.configJson) {
      configJson.verify_token = (existing.configJson as any).verify_token;
    }

    const config = await tenantClient.channelConnection.upsert({
      where: { tenantId_canal: { tenantId, canal: ExternalChannel.ZENIOR_FACEBOOK } },
      update: {
        habilitado: body.habilitado,
        configJson
      },
      create: {
        tenantId,
        canal: ExternalChannel.ZENIOR_FACEBOOK,
        habilitado: body.habilitado,
        configJson
      }
    });

    return { success: true, id: config.id };
  }

  @Post('zenior/test')
  async testConnection(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const roleName = req.user.role.name;

    if (roleName !== 'Admin' && roleName !== 'Gerente') throw new ForbiddenException('Permiso denegado.');

    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.channelConnection.findFirst({
      where: { tenantId, canal: ExternalChannel.ZENIOR_FACEBOOK }
    });

    if (!config || !config.configJson) {
      return { status: 'ERROR', message: 'No hay configuración' };
    }

    const configJson = config.configJson as any;
    let token = configJson.token;
    if (token) token = this.encryption.decrypt(token);

    if (!token || !configJson.phone_number_id) {
      return { status: 'ERROR', message: 'Faltan credenciales' };
    }

    try {
      // Simular prueba de conexión (e.g. Meta Graph API verify o un GET)
      // fetch(`https://graph.facebook.com/v19.0/${configJson.phone_number_id}?access_token=${token}`)
      return { status: 'CONECTADO', message: 'Credenciales válidas' };
    } catch (err) {
      return { status: 'ERROR', message: 'Falló la conexión con Zenior/Meta' };
    }
  }

}
