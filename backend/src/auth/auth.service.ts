import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { verifyPassword } from './password.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

const publicUserFields = { id: true, email: true, name: true } as const;

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
      user: { id: user.id, email: user.email, name: user.name },
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

  private signAccessToken(user: { id: string; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.signAsync(payload);
  }
}
