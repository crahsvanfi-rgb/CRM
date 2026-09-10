import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor() {
    const rawKey = process.env.AI_ENCRYPTION_KEY || '12345678901234567890123456789012';
    const normalizedKey = this.normalizeSecretKey(rawKey);
    this.secretKey = Buffer.from(normalizedKey, 'utf8');

    if (this.secretKey.byteLength !== 32) {
      console.error('AI_ENCRYPTION_KEY debe tener exactamente 32 bytes UTF-8. Revisa la variable en Render.');
    }
  }

  encrypt(text: string): string {
    if (!text) return '';
    this.assertValidKey();

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    this.assertValidKey();

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new InternalServerErrorException('Formato de texto encriptado invalido');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(ivHex, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  tryDecrypt(encryptedText?: string | null, context = 'API Key'): string | null {
    if (!encryptedText) return null;

    try {
      return this.decrypt(encryptedText);
    } catch (error: any) {
      console.warn(`${context} no pudo descifrarse con la AI_ENCRYPTION_KEY actual. Vuelve a guardar la clave para recifrarla.`);
      return null;
    }
  }

  private normalizeSecretKey(value: string): string {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }

  private assertValidKey() {
    if (this.secretKey.byteLength !== 32) {
      throw new BadRequestException(
        'AI_ENCRYPTION_KEY no esta configurada correctamente. Debe tener exactamente 32 bytes, sin comillas ni espacios.',
      );
    }
  }
}


