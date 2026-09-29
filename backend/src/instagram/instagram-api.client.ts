import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Versão da Graph API do Instagram usada nas chamadas com versão */
export const GRAPH_VERSION = 'v25.0';

/** Código da Meta para token recusado (expirado, revogado ou inválido) */
const INVALID_TOKEN_CODE = 190;

type Json = Record<string, unknown>;

/** Erro devolvido pela Meta (ou falta de resposta dela: status 0). */
export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }

  /** O token não vale mais: só reconectando a conta resolve */
  get invalidToken() {
    return this.code === INVALID_TOKEN_CODE;
  }
}

export interface LongLivedToken {
  accessToken: string;
  /** Validade em segundos (≈ 60 dias) */
  expiresIn: number;
}

export interface InstagramProfile {
  /** ID da conta profissional: é o usado para publicar */
  userId: string;
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  /** "Business" ou "Media_Creator" */
  accountType: string | null;
}

/**
 * Chamadas à API do Instagram (login do Instagram). Só HTTP: quem decide o que fazer com as
 * respostas é o InstagramService. Nos testes, esta classe é trocada por uma Meta simulada.
 */
@Injectable()
export class InstagramApiClient {
  constructor(private readonly config: ConfigService) {}

  /** Troca o código da volta do login por um token curto (1 hora). */
  async exchangeCode(code: string): Promise<string> {
    const body = await this.request(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        body: new URLSearchParams({
          client_id: this.setting('INSTAGRAM_APP_ID'),
          client_secret: this.setting('INSTAGRAM_APP_SECRET'),
          grant_type: 'authorization_code',
          redirect_uri: this.setting('INSTAGRAM_REDIRECT_URI'),
          code,
        }),
      },
    );
    return requireString(unwrap(body).access_token, 'access_token');
  }

  /** Troca o token curto pelo de 60 dias. */
  async exchangeForLongLived(shortToken: string): Promise<LongLivedToken> {
    const url = new URL('https://graph.instagram.com/access_token');
    url.search = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.setting('INSTAGRAM_APP_SECRET'),
      access_token: shortToken,
    }).toString();
    return toLongLived(await this.request(url));
  }

  /** Renova o token de 60 dias (ele precisa ter pelo menos 24 h e ainda valer). */
  async refreshLongLived(token: string): Promise<LongLivedToken> {
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.search = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    }).toString();
    return toLongLived(await this.request(url));
  }

  async getProfile(token: string): Promise<InstagramProfile> {
    const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);
    url.search = new URLSearchParams({
      fields: 'user_id,username,name,account_type,profile_picture_url',
      access_token: token,
    }).toString();
    const data = unwrap(await this.request(url));
    return {
      userId: requireString(data.user_id, 'user_id'),
      username: requireString(data.username, 'username'),
      name: optionalString(data.name),
      profilePictureUrl: optionalString(data.profile_picture_url),
      accountType: optionalString(data.account_type),
    };
  }

  private setting(name: string): string {
    return this.config.get<string>(name) ?? '';
  }

  private async request(url: string | URL, init?: RequestInit): Promise<Json> {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new InstagramApiError('Sem resposta da Meta', 0);
    }
    const body = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok || body.error !== undefined) throw toApiError(res.status, body);
    return body;
  }
}

/** Algumas respostas vêm dentro de `data: [...]` (conforme a documentação), outras soltas. */
function unwrap(body: Json): Json {
  const data = body.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    return data[0] as Json;
  }
  return body;
}

function toLongLived(body: Json): LongLivedToken {
  const expiresIn = Number(body.expires_in);
  return {
    accessToken: requireString(body.access_token, 'access_token'),
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 0,
  };
}

/**
 * Dois formatos de erro: `{ error: { message, code } }` (graph.instagram.com) e
 * `{ error_type, code, error_message }` (api.instagram.com, na troca do código).
 */
function toApiError(status: number, body: Json): InstagramApiError {
  const error = body.error;
  if (error && typeof error === 'object') {
    const { message, code } = error as { message?: unknown; code?: unknown };
    return new InstagramApiError(
      typeof message === 'string' ? message : `Erro ${status} da Meta`,
      status,
      typeof code === 'number' ? code : undefined,
    );
  }
  const message = body.error_message ?? body.error;
  return new InstagramApiError(
    typeof message === 'string' ? message : `Erro ${status} da Meta`,
    status,
    typeof body.code === 'number' ? body.code : undefined,
  );
}

function requireString(value: unknown, field: string): string {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number') return String(value);
  throw new InstagramApiError(`Resposta da Meta sem ${field}`, 502);
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
