import { describe, expect, it, afterEach } from 'vitest';
import { EncryptionService } from './encryption.service.js';

const originalKey = process.env.AI_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.AI_ENCRYPTION_KEY;
  } else {
    process.env.AI_ENCRYPTION_KEY = originalKey;
  }
});

describe('EncryptionService', () => {
  it('normaliza comillas alrededor de AI_ENCRYPTION_KEY', () => {
    process.env.AI_ENCRYPTION_KEY = '"12345678901234567890123456789012"';
    const service = new EncryptionService();

    const encrypted = service.encrypt('sk-or-test');

    expect(service.decrypt(encrypted)).toBe('sk-or-test');
  });

  it('falla con mensaje claro cuando AI_ENCRYPTION_KEY no mide 32 bytes', () => {
    process.env.AI_ENCRYPTION_KEY = 'short-key';
    const service = new EncryptionService();

    expect(() => service.encrypt('sk-or-test')).toThrow(/AI_ENCRYPTION_KEY/);
  });
  it('tryDecrypt devuelve null cuando el texto no se puede descifrar', () => {
    process.env.AI_ENCRYPTION_KEY = '12345678901234567890123456789012';
    const service = new EncryptionService();

    expect(service.tryDecrypt('valor-viejo-invalido', 'API Key test')).toBeNull();
  });
});

