import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { decryptSecret, encryptSecret } from '../common/crypto/secret-box.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InstagramApiClient,
  InstagramApiError,
} from './instagram-api.client.js';
import { InstagramSettingsService } from './instagram-settings.service.js';

/** Permissões pedidas no login: ler o perfil, publicar conteúdo e receber o direct */
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_messages',
];

/** Audiência do JWT usado como `state` do OAuth (não serve como token de acesso) */
export const OAUTH_STATE_AUDIENCE = 'instagram-oauth';

/** Contas profissionais aceitas pela API (o login oficial só libera essas) */
const PROFESSIONAL_ACCOUNTS = ['BUSINESS', 'MEDIA_CREATOR'];

/** O cron renova o token quando faltam menos que isso para vencer (dá várias tentativas) */
export const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;
/** A Meta só renova tokens com pelo menos 24 h */
const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
/** Se a Meta não informar a validade, vale a documentada: 60 dias */
const DEFAULT_TOKEN_TTL_S = 60 * 24 * 60 * 60;

/** Motivo da volta do login, lido pela tela (`/instagram?erro=...`) */
type ConnectError = 'negado' | 'conta' | 'expirado' | 'falha';

export interface CallbackQuery {
  code?: unknown;
  state?: unknown;
  error?: unknown;
}

/**
 * Conexão com o Instagram (API com login do Instagram). O login é o fluxo OAuth oficial da Meta:
 * o LeadNexi nunca vê a senha, só recebe um token com as permissões acima.
 */
@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly settings: InstagramSettingsService,
    private readonly api: InstagramApiClient,
  ) {}

  /** Conta conectada (sem o token) ou `connected: false`. */
  async getAccount() {
    const account = await this.prisma.instagramAccount.findFirst({
      select: {
        username: true,
        name: true,
        profilePictureUrl: true,
        tokenExpiresAt: true,
        tokenInvalidAt: true,
        messagesEnabledAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) return { connected: false as const };

    const { tokenInvalidAt, messagesEnabledAt, ...rest } = account;
    const needsReconnect =
      tokenInvalidAt !== null || account.tokenExpiresAt <= new Date();
    return {
      connected: true as const,
      account: {
        ...rest,
        needsReconnect,
        /** O direct vira lead (avisos de mensagem ligados nesta conexão) */
        messagesEnabled: messagesEnabledAt !== null,
      },
    };
  }

  /** Desconecta: apaga a conta e o token guardado. */
  async disconnect() {
    await this.prisma.instagramAccount.deleteMany();
    this.logger.log('Conta do Instagram desconectada');
  }

  /**
   * Link do login oficial do Instagram. O `state` é um JWT curto (10 min) com o usuário,
   * conferido no retorno para impedir que alguém injete o login de outra conta (CSRF).
   * `origin` é o endereço público do servidor (monta o endereço de retorno).
   */
  async createAuthorizeUrl(userId: string, origin: string) {
    // Sem app configurado (ou sem chave de criptografia), avisa já: o login falharia na volta
    const app = await this.settings.require(origin);
    this.settings.requireKey();
    const state = await this.jwtService.signAsync(
      { sub: userId },
      { audience: OAUTH_STATE_AUDIENCE, expiresIn: '10m' },
    );
    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: app.appId,
      redirect_uri: app.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    }).toString();
    return { url: url.toString() };
  }

  /**
   * Volta do login do Instagram: confere o `state`, troca o código pelo token de 60 dias, lê o
   * perfil e guarda a conta com o token criptografado. Devolve para onde levar o navegador
   * (a tela do Instagram, com o resultado na URL). Nunca lança: todo erro vira `?erro=`.
   */
  async completeConnection(
    query: CallbackQuery,
    origin: string,
  ): Promise<string> {
    try {
      // Cancelou no Instagram (ex.: error=access_denied)
      if (query.error !== undefined) return failure('negado');
      if (typeof query.code !== 'string' || typeof query.state !== 'string') {
        return failure('falha');
      }

      const stateError = await this.checkState(query.state);
      if (stateError) return failure(stateError);

      const app = await this.settings.require(origin);
      const key = this.settings.requireKey();
      const shortToken = await this.api.exchangeCode(query.code, app);
      const longToken = await this.api.exchangeForLongLived(
        shortToken,
        app.appSecret,
      );
      const profile = await this.api.getProfile(longToken.accessToken);

      const accountType = profile.accountType?.toUpperCase();
      if (accountType && !PROFESSIONAL_ACCOUNTS.includes(accountType)) {
        return failure('conta');
      }

      const data = {
        username: profile.username,
        name: profile.name,
        profilePictureUrl: profile.profilePictureUrl,
        accessToken: encryptSecret(longToken.accessToken, key),
        tokenExpiresAt: expiresAt(longToken.expiresIn),
        tokenInvalidAt: null,
        messagesEnabledAt: await this.enableMessages(longToken.accessToken),
      };
      // Uma conta por vez: conectar outra substitui a anterior
      await this.prisma.$transaction([
        this.prisma.instagramAccount.deleteMany({
          where: { igUserId: { not: profile.userId } },
        }),
        this.prisma.instagramAccount.upsert({
          where: { igUserId: profile.userId },
          create: { igUserId: profile.userId, ...data },
          update: data,
        }),
      ]);
      this.logger.log(`Instagram @${profile.username} conectado`);
      return '/instagram?conectado=1';
    } catch (error) {
      this.logger.error(`Falha ao conectar o Instagram: ${describe(error)}`);
      return failure('falha');
    }
  }

  /**
   * Liga os avisos do direct para a conta. Falha (ex.: permissão de mensagens não concedida ou
   * webhook ainda não configurado no app) não impede a conexão: a tela avisa, e conectar de novo
   * tenta outra vez.
   */
  private async enableMessages(token: string): Promise<Date | null> {
    try {
      await this.api.subscribeToMessages(token);
      return new Date();
    } catch (error) {
      this.logger.warn(
        `Avisos do direct não ligados para a conta: ${describe(error)}`,
      );
      return null;
    }
  }

  /**
   * Renova os tokens que vencem nos próximos 10 dias (chamado pelo cron diário). Token recusado
   * pela Meta marca a conta para reconexão; falha passageira fica para a próxima rodada.
   */
  async refreshExpiringTokens(now = new Date()) {
    // Renovar só precisa do token (e da chave para abri-lo), não das credenciais do app
    const key = this.settings.requireKey();
    const accounts = await this.prisma.instagramAccount.findMany({
      where: {
        tokenInvalidAt: null,
        tokenExpiresAt: {
          gt: now,
          lte: new Date(now.getTime() + REFRESH_WINDOW_MS),
        },
        updatedAt: { lte: new Date(now.getTime() - MIN_TOKEN_AGE_MS) },
      },
    });

    const result = { refreshed: 0, invalid: 0, failed: 0 };
    for (const account of accounts) {
      try {
        const token = await this.api.refreshLongLived(
          this.readToken(account.accessToken, key),
        );
        await this.prisma.instagramAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encryptSecret(token.accessToken, key),
            tokenExpiresAt: expiresAt(token.expiresIn, now),
          },
        });
        result.refreshed++;
      } catch (error) {
        if (error instanceof UnreadableTokenError || isInvalidToken(error)) {
          await this.prisma.instagramAccount.update({
            where: { id: account.id },
            data: { tokenInvalidAt: now },
          });
          result.invalid++;
        } else {
          result.failed++;
        }
        this.logger.warn(
          `Token do Instagram @${account.username} não renovado: ${describe(error)}`,
        );
      }
    }
    return result;
  }

  /** Abre o token guardado (criptografado). Se não abre (ex.: chave trocada), só reconectando. */
  private readToken(stored: string, key: Buffer): string {
    try {
      return decryptSecret(stored, key);
    } catch {
      throw new UnreadableTokenError();
    }
  }

  /** O `state` precisa ser nosso, recente e de um usuário que existe. */
  private async checkState(state: string): Promise<ConnectError | null> {
    try {
      const { sub } = await this.jwtService.verifyAsync<{ sub: string }>(
        state,
        { audience: OAUTH_STATE_AUDIENCE },
      );
      const user = await this.prisma.user.findUnique({ where: { id: sub } });
      return user ? null : 'falha';
    } catch (error) {
      // Passou dos 10 minutos entre clicar em "Conectar" e voltar
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        return 'expirado';
      }
      return 'falha';
    }
  }
}

/** O token guardado não pôde ser descriptografado (chave trocada ou dado corrompido). */
class UnreadableTokenError extends Error {
  constructor() {
    super(
      'Token guardado não pôde ser lido (chave de criptografia diferente?)',
    );
  }
}

function isInvalidToken(error: unknown) {
  return error instanceof InstagramApiError && error.invalidToken;
}

function failure(reason: ConnectError) {
  return `/instagram?erro=${reason}`;
}

function expiresAt(expiresInSeconds: number, from = new Date()) {
  const seconds = expiresInSeconds > 0 ? expiresInSeconds : DEFAULT_TOKEN_TTL_S;
  return new Date(from.getTime() + seconds * 1000);
}

/** Mensagem de erro para o log, sem dados da requisição (tokens ficam fora) */
function describe(error: unknown) {
  if (error instanceof InstagramApiError) {
    return `${error.message} (HTTP ${error.status}${error.code ? `, código ${error.code}` : ''})`;
  }
  return error instanceof Error ? error.message : String(error);
}
