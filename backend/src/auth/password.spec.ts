import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('valida a senha correta', async () => {
    const hash = await hashPassword('segredo123');
    expect(await verifyPassword('segredo123', hash)).toBe(true);
  });

  it('rejeita senha errada', async () => {
    const hash = await hashPassword('segredo123');
    expect(await verifyPassword('outra', hash)).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt)', async () => {
    expect(await hashPassword('abc')).not.toBe(await hashPassword('abc'));
  });

  it('rejeita hash em formato inválido', async () => {
    expect(await verifyPassword('abc', 'invalido')).toBe(false);
  });
});
