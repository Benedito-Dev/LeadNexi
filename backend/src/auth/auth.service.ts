import { BadRequestException, Injectable, NotFoundException, UnauthorizedException, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { readJpegSize } from '../common/utils/jpeg.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.types.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { hashPassword, verifyPassword } from './password.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

const publicUserFields = { id: true, email: true, name: true, avatarId: true } as const;

/** A foto chega já recortada pelo navegador (256x256); acima disso, algo deu errado no recorte. */
const MAX_AVATAR_SIDE = 1024;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokensService,
  ) {}

  /** Confere a senha e abre uma sessão: access token (curto) + refresh token (cookie). */
  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Mesma mensagem para e-mail e senha: não revela quais e-mails existem
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const refresh = await this.refreshTokens.issueForLogin(user.id);
    return {
      accessToken: await this.signAccessToken(user),
      user: { id: user.id, email: user.email, name: user.name, avatarId: user.avatarId },
      refresh,
    };
  }

  /** Troca o refresh token (rotação) e emite um access token novo. */
  async refresh(rawRefreshToken: string | undefined) {
    const { userId, issued } = await this.refreshTokens.rotate(rawRefreshToken);
    const user = await this.me(userId);
    return {
      accessToken: await this.signAccessToken(user),
      user,
      refresh: issued,
    };
  }

  /** Encerra a sessão no servidor: o refresh token deixa de valer na hora. */
  logout(rawRefreshToken: string | undefined) {
    return this.refreshTokens.revoke(rawRefreshToken);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserFields,
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return user;
  }

  /** Perfil: nome e e-mail de login (e-mail já usado = 409, pelo filtro do Prisma). */
  updateProfile(userId: string, { name, email }: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      },
      select: publicUserFields,
    });
  }

  /** Confere a senha atual, grava a nova e encerra as outras sessões (fica só esta). */
  async changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordDto, rawRefreshToken: string | undefined) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new BadRequestException('A senha atual não confere.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    await this.refreshTokens.revokeOthers(userId, rawRefreshToken);
  }

  /** Foto de perfil nova (JPEG). Ganha um ID novo, então o link antigo some do cache. */
  async setAvatar(userId: string, file: { buffer: Buffer } | undefined) {
    if (!file) throw new BadRequestException('Envie a foto no campo "file".');
    const size = readJpegSize(file.buffer);
    if (!size) throw new UnsupportedMediaTypeException('A foto precisa estar em JPEG.');
    if (size.width > MAX_AVATAR_SIDE || size.height > MAX_AVATAR_SIDE) {
      throw new BadRequestException(`A foto pode ter no máximo ${MAX_AVATAR_SIDE}px de lado.`);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarId: randomUUID(), avatar: new Uint8Array(file.buffer) },
      select: publicUserFields,
    });
  }

  removeAvatar(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { avatarId: null, avatar: null }, select: publicUserFields });
  }

  /** A foto pelo ID dela (público: o ID é aleatório e muda a cada foto). */
  async avatar(avatarId: string) {
    const user = await this.prisma.user.findUnique({ where: { avatarId }, select: { avatar: true } });
    if (!user?.avatar) throw new NotFoundException('Foto não encontrada');
    return user.avatar;
  }

  private signAccessToken(user: { id: string; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.signAsync(payload);
  }
}
