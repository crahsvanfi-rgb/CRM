import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class AiConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getConfig(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.aIConfiguration.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return {
        habilitada: false,
        modelo: 'openai/gpt-4o-mini',
        temperatura: 0.3,
        maxTokens: 1000,
        promptGeneral: '',
        instruccionesInternas: '',
        tono: 'profesional',
        idioma: 'es',
        estado: 'SIN_CONFIGURAR',
        apiKey: null,
      };
    }

    let promptGeneral = '';
    let instruccionesInternas = '';
    let tono = 'profesional';
    let idioma = 'es';

    if (config.systemPrompt) {
      try {
        const parsed = JSON.parse(config.systemPrompt);
        promptGeneral = parsed.promptGeneral ?? '';
        instruccionesInternas = parsed.instruccionesInternas ?? '';
        tono = parsed.tono ?? 'profesional';
        idioma = parsed.idioma ?? 'es';
      } catch {
        promptGeneral = config.systemPrompt;
      }
    }

    let maskedApiKey = null;
    let apiKeyDecryptError = false;
    if (config.apiKey) {
      const decrypted = this.encryption.tryDecrypt(config.apiKey, 'API Key de OpenRouter de IA');
      if (decrypted && decrypted.length >= 4) {
        maskedApiKey = `****${decrypted.slice(-4)}`;
      } else if (decrypted) {
        maskedApiKey = '****';
      } else {
        maskedApiKey = '****ERROR';
        apiKeyDecryptError = true;
      }
    }

    return {
      habilitada: config.habilitada,
      modelo: config.defaultModel || 'openai/gpt-4o-mini',
      temperatura: config.temperature ? Number(config.temperature) : 0.3,
      maxTokens: config.maxTokens || 1000,
      promptGeneral,
      instruccionesInternas,
      tono,
      idioma,
      estado: apiKeyDecryptError ? 'ERROR' : config.apiKey ? 'CONECTADO' : 'SIN_CONFIGURAR',
      apiKey: maskedApiKey,
      apiKeyError: apiKeyDecryptError ? 'La API Key no pudo descifrarse. Vuelve a guardarla en Configuraci\u00f3n \u2192 IA' : null,
    };
  }

  async updateConfig(tenantId: string, dto: UpdateAiConfigDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.aIConfiguration.findUnique({
      where: { tenantId },
    });

    const incomingApiKey = dto.apiKey?.trim();
    const providesNewKey = Boolean(incomingApiKey && !incomingApiKey.startsWith('****'));
    const existingApiKey = config?.apiKey
      ? this.encryption.tryDecrypt(config.apiKey, 'API Key de OpenRouter de IA')
      : null;
    const hasUsableKey = Boolean(existingApiKey || providesNewKey);

    if (dto.habilitada && !hasUsableKey) {
      throw new BadRequestException('La API Key no pudo descifrarse. Vuelve a guardarla en Configuraci\u00f3n \u2192 IA');
    }
    // Preserve existing systemPrompt subfields if not explicitly passed
    let currentParsed: any = {};
    if (config?.systemPrompt) {
      try {
        currentParsed = JSON.parse(config.systemPrompt);
      } catch {
        currentParsed = { promptGeneral: config.systemPrompt };
      }
    }

    const systemPromptObj = {
      promptGeneral: dto.promptGeneral ?? currentParsed.promptGeneral ?? '',
      instruccionesInternas: dto.instruccionesInternas ?? currentParsed.instruccionesInternas ?? '',
      tono: dto.tono ?? currentParsed.tono ?? 'profesional',
      idioma: dto.idioma ?? currentParsed.idioma ?? 'es',
    };

    const tempValue = dto.temperatura ?? (config?.temperature ? Number(config.temperature) : 0.3);

    const dataToSave: any = {
      habilitada: dto.habilitada ?? config?.habilitada ?? false,
      provider: 'openrouter',
      defaultModel: dto.modelo || config?.defaultModel || 'openai/gpt-4o-mini',
      temperature: new Prisma.Decimal(tempValue),
      maxTokens: dto.maxTokens ?? config?.maxTokens ?? 1000,
      systemPrompt: JSON.stringify(systemPromptObj),
    };

    if (incomingApiKey !== undefined) {
      if (!incomingApiKey) {
        dataToSave.apiKey = null;
      } else if (!incomingApiKey.startsWith('****')) {
        dataToSave.apiKey = this.encryption.encrypt(incomingApiKey);
      }
    }
    if (config) {
      return tenantClient.aIConfiguration.update({
        where: { tenantId },
        data: dataToSave,
      });
    } else {
      dataToSave.tenantId = tenantId;
      return tenantClient.aIConfiguration.create({
        data: dataToSave,
      });
    }
  }

  async testConnection(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.aIConfiguration.findUnique({ where: { tenantId } });

    if (!config || !config.apiKey) {
      throw new BadRequestException('No hay una configuración o API Key válida para probar.');
    }

    const decryptedKey = this.encryption.tryDecrypt(config.apiKey, 'API Key de OpenRouter de IA');
    if (!decryptedKey) {
      throw new BadRequestException('La API Key no pudo descifrarse. Vuelve a guardarla en Configuraci\u00f3n \u2192 IA');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${decryptedKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter devolvió status ${response.status}`);
      }

      return { success: true, message: 'Conexión exitosa a OpenRouter' };
    } catch (e: any) {
      throw new BadRequestException(`Fallo en la prueba de conexión: ${e.message}`);
    }
  }

  async clearApiKey(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    await tenantClient.aIConfiguration.updateMany({
      where: { tenantId },
      data: { apiKey: null, habilitada: false },
    });
    return { success: true, message: 'API Key de IA limpiada. Vuelve a guardarla en Configuraci\u00f3n \u2192 IA.' };
  }

  async resetConfig(tenantId: string) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.aIConfiguration.findUnique({ where: { tenantId } });
    if (config) {
      await tenantClient.aIConfiguration.delete({
        where: { tenantId },
      });
    }
    return { success: true, message: 'Configuración restablecida con éxito' };
  }
}





