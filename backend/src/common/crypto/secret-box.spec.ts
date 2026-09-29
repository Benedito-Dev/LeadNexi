import { randomBytes } from 'node:crypto';
import {
  decryptSecret,
  encryptSecret,
  parseEncryptionKey,
} from './secret-box.js';

describe('secret-box', () => {
  const key = randomBytes(32);

  it('devolve o texto original ao descriptografar', () => {
    const stored = encryptSecret('token-secreto-123', key);
    expect(stored).not.toContain('token-secreto-123');
    expect(decryptSecret(stored, key)).toBe('token-secreto-123');
  });

  it('gera um resultado diferente a cada vez (IV aleatório)', () => {
    expect(encryptSecret('abc', key)).not.toBe(encryptSecret('abc', key));
  });

  it('recusa chave errada e texto adulterado', () => {
    const stored = encryptSecret('abc', key);
    expect(() => decryptSecret(stored, randomBytes(32))).toThrow();

    const [version, iv, tag, data] = stored.split('.');
    const flipped = Buffer.from(data, 'base64url');
    flipped[0] ^= 1;
    const tampered = [version, iv, tag, flipped.toString('base64url')].join(
      '.',
    );
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it('só aceita chave de 32 bytes em base64', () => {
    expect(parseEncryptionKey(randomBytes(32).toString('base64'))).toHaveLength(
      32,
    );
    expect(parseEncryptionKey(randomBytes(16).toString('base64'))).toBeNull();
    expect(parseEncryptionKey('')).toBeNull();
    expect(parseEncryptionKey(undefined)).toBeNull();
  });
});
