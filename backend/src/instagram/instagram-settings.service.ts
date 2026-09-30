import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decryptSecret,
  encryptSecret,
  resolveEncryptionKey,
} from '../common/crypto/secret-box.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveInstagramSettingsDto } from './dto/save-instagram-settings.dto.js';
import type { InstagramAppCredentials } from './instagram-api.client.js';

const SETTINGS_ID = 1;
const CALLBACK_PATH = '/api/instagram/callback';

/**
 * Configuração do app da Meta. Vem da tela do Instagram (salva no banco, chave secreta
 * criptografada) ou, sem ela, das variáveis INSTAGRAM_* do servidor. A tela tem prioridade:
 * trocar o app não precisa de deploy.
 */
@Injectable()
export class InstagramSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** O que a tela mostra. A chave secreta nunca sai do servidor: só se ela está salva. */
  async view(origin: string) {
    const saved = await this.prisma.instagramAppSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const env = this.fromEnv();
    const appId = saved?.appId ?? env.appId;
    const secretSaved = Boolean(saved ?? env.appSecret);
    return {
      appId,
      secretSaved,
      /** De onde vem a configuração em uso: tela, variáveis do servidor ou nenhuma */
      source: saved ? 'tela' : env.appId && env.appSecret ? 'servidor' : null,
      configured: Boolean(appId && secretSaved),
      redirectUri: this.redirectUri(origin),
    };
  }

  /** Salva pela tela. Sem chave secreta nova, mantém a que já estava salva. */
  async save(dto: SaveInstagramSettingsDto, origin: string) {
    const key = this.requireKey();
    const appSecret = dto.appSecret?.trim();
    const saved = await this.prisma.instagramAppSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const encrypted = appSecret ? encryptSecret(appSecret, key) : undefined;

    if (saved) {
      await this.prisma.instagramAppSettings.update({
        where: { id: SETTINGS_ID },
        data: { appId: dto.appId, appSecret: encrypted },
      });
    } else if (encrypted) {
      await this.prisma.instagramAppSettings.create({
        data: { id: SETTINGS_ID, appId: dto.appId, appSecret: encrypted },
      });
    } else {
      throw new BadRequestException('Informe a chave secreta do app.');
    }
    return this.view(origin);
  }

  /** Credenciais para falar com a Meta. Sem configuração (tela ou servidor): 503 com orientação. */
  async require(origin: string): Promise<InstagramAppCredentials> {
    const saved = await this.prisma.instagramAppSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const redirectUri = this.redirectUri(origin);

    if (saved) {
      try {
        const appSecret = decryptSecret(saved.appSecret, this.requireKey());
        return { appId: saved.appId, appSecret, redirectUri };
      } catch {
        throw new ServiceUnavailableException(
          'Salve a chave secreta do app da Meta de novo na tela do Instagram.',
        );
      }
    }
    const env = this.fromEnv();
    if (env.appId && env.appSecret) {
      return { appId: env.appId, appSecret: env.appSecret, redirectUri };
    }
    throw new ServiceUnavailableException(
      'Configure o app da Meta na tela do Instagram.',
    );
  }

  /** Chave que criptografa o token do Instagram e a chave secreta do app. */
  requireKey(): Buffer {
    const key = resolveEncryptionKey(
      this.config.get<string>('TOKEN_ENCRYPTION_KEY'),
      this.config.get<string>('JWT_SECRET'),
    );
    if (!key) {
      throw new ServiceUnavailableException(
        'A variável TOKEN_ENCRYPTION_KEY do servidor é inválida (precisa ter 32 bytes em base64).',
      );
    }
    return key;
  }

  /** INSTAGRAM_REDIRECT_URI, se definida; senão, o callback deste mesmo servidor. */
  private redirectUri(origin: string) {
    return (
      this.config.get<string>('INSTAGRAM_REDIRECT_URI') ||
      `${origin}${CALLBACK_PATH}`
    );
  }

  private fromEnv() {
    return {
      appId: this.config.get<string>('INSTAGRAM_APP_ID') || null,
      appSecret: this.config.get<string>('INSTAGRAM_APP_SECRET') || null,
    };
  }
}
