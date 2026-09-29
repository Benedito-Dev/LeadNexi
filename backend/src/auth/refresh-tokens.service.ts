import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Reúso de um token já rotacionado dentro desta janela é tratado como corrida (duas abas
 * renovando juntas) e não como roubo: recebe um token novo em vez de derrubar a sessão.
 */
const REUSE_GRACE_MS = 30_000;

export interface IssuedRefreshToken {
  /** Valor do cookie: "<id>.<segredo>" */
  token: string;
  expiresAt: Date;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * Refresh tokens com rotação e detecção de reúso (padrão OAuth 2.0 BCP).
 * O segredo tem 256 bits aleatórios; no banco fica só o sha256 dele.
 */
@Injectable()
export class RefreshTokensService {
  private readonly logger = new Logger(RefreshTokensService.name);
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const days = Number(config.get('REFRESH_TOKEN_TTL_DAYS', 30));
    this.ttlMs = days * 24 * 60 * 60 * 1000;
  }

  /** Novo login: abre uma família de sessão e limpa tokens vencidos do usuário. */
  async issueForLogin(userId: string): Promise<IssuedRefreshToken> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
    return this.create(userId, randomUUID());
  }

  /**
   * Troca um refresh token válido por um novo (rotação) e devolve o dono.
   * Token revogado reapresentado fora da janela de tolerância = provável roubo:
   * a família inteira é revogada e o usuário precisa entrar de novo.
   */
  async rotate(
    raw: string | undefined,
  ): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const current = await this.find(raw);
    const now = Date.now();

    if (current.expiresAt.getTime() <= now) {
      throw new UnauthorizedException('Sessão expirada');
    }

    if (current.revokedAt) {
      const withinGrace =
        current.replacedById !== null &&
        now - current.revokedAt.getTime() <= REUSE_GRACE_MS;
      if (!withinGrace) {
        await this.revokeFamily(current.familyId);
        this.logger.warn(
          `Reúso de refresh token revogado: família ${current.familyId} encerrada`,
        );
        throw new UnauthorizedException('Sessão encerrada');
      }
      // Corrida entre abas: mais um token na mesma família, sem derrubar a sessão
      return {
        userId: current.userId,
        issued: await this.create(current.userId, current.familyId),
      };
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      const next = await this.create(current.userId, current.familyId, tx);
      await tx.refreshToken.update({
        where: { id: current.id },
        data: { revokedAt: new Date(), replacedById: next.id },
      });
      return next;
    });
    return { userId: current.userId, issued };
  }

  /** Logout: encerra a sessão (família) do token apresentado. Token inválido é ignorado. */
  async revoke(raw: string | undefined): Promise<void> {
    try {
      const current = await this.find(raw);
      await this.revokeFamily(current.familyId);
    } catch {
      // Sem sessão válida: não há o que encerrar
    }
  }

  /** Busca pelo id e confere o segredo em tempo constante. */
  private async find(raw: string | undefined) {
    const [id, secret] = raw?.split('.') ?? [];
    if (!id || !secret) throw new UnauthorizedException('Sessão inválida');

    const record = await this.prisma.refreshToken
      .findUnique({ where: { id } })
      .catch(() => null); // id malformado (não-uuid) = inválido
    const expected = record ? Buffer.from(record.tokenHash, 'hex') : null;
    const actual = sha256(secret);
    if (!record || !expected || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Sessão inválida');
    }
    return record;
  }

  private revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async create(
    userId: string,
    familyId: string,
    tx: Pick<PrismaService, 'refreshToken'> = this.prisma,
  ): Promise<IssuedRefreshToken & { id: string }> {
    const secret = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    const { id } = await tx.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(secret).toString('hex'),
        expiresAt,
      },
      select: { id: true },
    });
    return { id, token: `${id}.${secret}`, expiresAt };
  }
}
