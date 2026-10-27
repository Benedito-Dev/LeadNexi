import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service.js';
import { fakeJpeg } from '../../test/fake-jpeg.js';
import { AuthService } from './auth.service.js';
import { hashPassword, verifyPassword } from './password.js';
import type { RefreshTokensService } from './refresh-tokens.service.js';

async function setup() {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({ passwordHash: await hashPassword('senha-atual') }),
      update: vi.fn().mockResolvedValue({ id: 'u1', email: 'novo@email.com', name: 'Benedito' }),
    },
  };
  const refreshTokens = { revokeOthers: vi.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma as unknown as PrismaService, {} as JwtService, refreshTokens as unknown as RefreshTokensService);
  return { prisma, refreshTokens, service };
}

describe('AuthService › perfil e senha', () => {
  it('troca a senha conferindo a atual e encerra as outras sessões', async () => {
    const { service, prisma, refreshTokens } = await setup();

    await service.changePassword('u1', { currentPassword: 'senha-atual', newPassword: 'senha-nova-123' }, 'cookie');

    const { data } = prisma.user.update.mock.calls[0][0];
    expect(await verifyPassword('senha-nova-123', data.passwordHash)).toBe(true);
    expect(refreshTokens.revokeOthers).toHaveBeenCalledWith('u1', 'cookie');
  });

  it('recusa quando a senha atual não confere, sem mexer em nada', async () => {
    const { service, prisma, refreshTokens } = await setup();
    await expect(service.changePassword('u1', { currentPassword: 'errada', newPassword: 'senha-nova-123' }, 'cookie')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(refreshTokens.revokeOthers).not.toHaveBeenCalled();
  });

  it('grava o e-mail em minúsculas e sem espaços', async () => {
    const { service, prisma } = await setup();
    await service.updateProfile('u1', { email: '  Novo@Email.com ' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { email: 'novo@email.com' } }));
  });

  it('guarda a foto em JPEG com um ID novo e recusa outro formato ou tamanho grande', async () => {
    const { service, prisma } = await setup();

    await service.setAvatar('u1', { buffer: fakeJpeg(256, 256) });
    const { data } = prisma.user.update.mock.calls[0][0];
    expect(data.avatarId).toMatch(/^[0-9a-f-]{36}$/);

    await expect(service.setAvatar('u1', { buffer: Buffer.from('PNG') })).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    await expect(service.setAvatar('u1', { buffer: fakeJpeg(4000, 3000) })).rejects.toBeInstanceOf(BadRequestException);
  });
});
