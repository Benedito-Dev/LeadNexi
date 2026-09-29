import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

/** Permissões pedidas no login: ler o perfil e publicar conteúdo */
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
];

/** Audiência do JWT usado como `state` do OAuth (não serve como token de acesso) */
export const OAUTH_STATE_AUDIENCE = 'instagram-oauth';

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
    private readonly config: ConfigService,
  ) {}

  /** Conta conectada (sem o token) ou `connected: false`. */
  async getAccount() {
    const account = await this.prisma.instagramAccount.findFirst({
      select: {
        username: true,
        name: true,
        profilePictureUrl: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return account
      ? { connected: true as const, account }
      : { connected: false as const };
  }

  /** Desconecta: apaga a conta e o token guardado. */
  async disconnect() {
    await this.prisma.instagramAccount.deleteMany();
    this.logger.log('Conta do Instagram desconectada');
  }

  /**
   * Link do login oficial do Instagram. O `state` é um JWT curto (10 min) com o usuário,
   * conferido no retorno para impedir que alguém injete o login de outra conta (CSRF).
   */
  async createAuthorizeUrl(userId: string) {
    const clientId = this.config.get<string>('INSTAGRAM_APP_ID');
    const redirectUri = this.config.get<string>('INSTAGRAM_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException(
        'A integração com o Instagram ainda não foi configurada no servidor.',
      );
    }

    const state = await this.jwtService.signAsync(
      { sub: userId },
      { audience: OAUTH_STATE_AUDIENCE, expiresIn: '10m' },
    );
    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    }).toString();
    return { url: url.toString() };
  }
}
