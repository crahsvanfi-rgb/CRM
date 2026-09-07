import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.AI_ENCRYPTION_KEY || '12345678901234567890123456789012';
    if (this.secretKey.length !== 32) {
      console.warn('AI_ENCRYPTION_KEY no está configurada correctamente. Debe tener 32 caracteres.');
    }
  }

  encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secretKey), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new InternalServerErrorException('Formato de texto encriptado inválido');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.secretKey),
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
