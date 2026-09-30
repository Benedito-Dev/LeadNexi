import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

// Segredos guardados no banco (ex.: token do Instagram) ficam criptografados com AES-256-GCM, que
// também detecta adulteração. Formato: "v1.<iv>.<tag>.<dados>" em base64url; o "v1" permite trocar
// o esquema no futuro sem perder o que já está gravado.
const VERSION = 'v1';
const IV_BYTES = 12;

/** Lê a chave: 32 bytes em base64 (ex.: `openssl rand -base64 32`). Ausente ou inválida: null. */
export function parseEncryptionKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value, 'base64');
  return key.length === 32 ? key : null;
}

/**
 * Chave usada para criptografar os segredos: TOKEN_ENCRYPTION_KEY, se definida; senão, uma chave
 * derivada (HKDF) do JWT_SECRET, que o servidor sempre tem. Assim não há variável extra para
 * configurar. Quem tem o JWT_SECRET já controla o sistema inteiro, então derivar dele não
 * enfraquece nada. Chave explícita inválida: null (não cai na derivada sem avisar).
 */
export function resolveEncryptionKey(
  explicitKey: string | undefined,
  jwtSecret: string | undefined,
): Buffer | null {
  if (explicitKey) return parseEncryptionKey(explicitKey);
  if (!jwtSecret) return null;
  return Buffer.from(
    hkdfSync('sha256', jwtSecret, 'leadnexi', 'token-encryption', 32),
  );
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const parts = [iv, cipher.getAuthTag(), data].map((part) =>
    part.toString('base64url'),
  );
  return [VERSION, ...parts].join('.');
}

/** Falha (lança erro) com chave errada, texto adulterado ou formato desconhecido. */
export function decryptSecret(stored: string, key: Buffer): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== VERSION || !iv || !tag || data === undefined) {
    throw new Error('Segredo em formato desconhecido');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
