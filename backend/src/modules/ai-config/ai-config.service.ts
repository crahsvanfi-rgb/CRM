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
    if (config.apiKey) {
      try {
        const decrypted = this.encryption.decrypt(config.apiKey);
        if (decrypted && decrypted.length >= 4) {
          maskedApiKey = `****${decrypted.slice(-4)}`;
        } else if (decrypted) {
          maskedApiKey = `****`;
        }
      } catch (e) {
        maskedApiKey = '****ERROR';
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
      estado: config.apiKey ? 'CONECTADO' : 'SIN_CONFIGURAR',
      apiKey: maskedApiKey,
    };
  }

  async updateConfig(tenantId: string, dto: UpdateAiConfigDto) {
    const tenantClient = this.prisma.getTenantClient(tenantId);
    const config = await tenantClient.aIConfiguration.findUnique({
      where: { tenantId },
    });

    if (dto.habilitada) {
      const hasKeyInDb = config?.apiKey != null && config?.apiKey !== '';
      const providesNewKey = dto.apiKey != null && dto.apiKey.trim() !== '';
      if (!hasKeyInDb && !providesNewKey) {
        throw new BadRequestException('Se requiere una API Key para habilitar la IA.');
      }
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

    if (dto.apiKey && dto.apiKey.trim() !== '') {
      dataToSave.apiKey = this.encryption.encrypt(dto.apiKey.trim());
    }

    if (config) {
      return tenantClient.aIConfiguration.update({
        where: { tenantId },
        data: dataToSave,
      });
    } else {
      dataToSave.tenantId = tenantId;
      if (!dataToSave.apiKey) {
        dataToSave.apiKey = this.encryption.encrypt('sk-or-v1-initial-placeholder');
      }
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

    let decryptedKey: string;
    try {
      decryptedKey = this.encryption.decrypt(config.apiKey);
    } catch (e) {
      throw new InternalServerErrorException('No se pudo descifrar la API Key.');
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
