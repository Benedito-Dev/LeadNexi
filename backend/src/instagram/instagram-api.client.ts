import { Injectable } from '@nestjs/common';

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
    /** Detalhe da Meta (ex.: 2207042 = limite diário de posts) */
    readonly subcode?: number,
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

/** Credenciais do app da Meta (da tela do Instagram ou das variáveis do servidor) */
export interface InstagramAppCredentials {
  appId: string;
  appSecret: string;
  /** Endereço de retorno do login: precisa ser o mesmo cadastrado no app da Meta */
  redirectUri: string;
}

/** Quem mandou direct: o que a Meta informa do perfil (pode faltar) */
export interface MessagingProfile {
  name: string | null;
  username: string | null;
  /** Link da foto de perfil na Meta (expira em poucos dias: baixar e guardar) */
  profilePictureUrl: string | null;
}

/** Foto de perfil maior que isso não é baixada */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Situação de um contêiner (post preparado na Meta, antes de publicar) */
export type ContainerStatus =
  'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED' | 'PUBLISHED';

/** Posts no perfil (ver listProfileMedia) */
export interface ProfileMedia {
  ids: Set<string>;
  /** A lista cobre tudo desde `since` (ou o perfil inteiro) */
  complete: boolean;
  /** Data do post mais antigo lido (até onde a lista cobre, se incompleta) */
  oldest: Date | null;
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
  /** Troca o código da volta do login por um token curto (1 hora). */
  async exchangeCode(
    code: string,
    app: InstagramAppCredentials,
  ): Promise<string> {
    const body = await this.request(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        body: new URLSearchParams({
          client_id: app.appId,
          client_secret: app.appSecret,
          grant_type: 'authorization_code',
          redirect_uri: app.redirectUri,
          code,
        }),
      },
    );
    return requireString(unwrap(body).access_token, 'access_token');
  }

  /** Troca o token curto pelo de 60 dias. */
  async exchangeForLongLived(
    shortToken: string,
    appSecret: string,
  ): Promise<LongLivedToken> {
    const url = new URL('https://graph.instagram.com/access_token');
    url.search = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
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

  /**
   * Liga os avisos (webhook) de mensagens do direct para a conta. Precisa da permissão
   * instagram_business_manage_messages no login e do webhook configurado no app da Meta.
   */
  async subscribeToMessages(token: string): Promise<void> {
    await this.request(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/subscribed_apps`,
      {
        method: 'POST',
        body: new URLSearchParams({
          subscribed_fields: 'messages',
          access_token: token,
        }),
      },
    );
  }

  /** Nome, @ e foto de quem mandou direct (pelo ID dessa pessoa no Instagram, o IGSID). */
  async getMessagingProfile(
    senderId: string,
    token: string,
  ): Promise<MessagingProfile> {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/${senderId}`,
    );
    url.search = new URLSearchParams({
      fields: 'name,username,profile_pic',
      access_token: token,
    }).toString();
    const body = await this.request(url);
    return {
      name: optionalString(body.name),
      username: optionalString(body.username),
      profilePictureUrl: optionalString(body.profile_pic),
    };
  }

  /** Baixa uma imagem da Meta (ex.: foto de perfil), até 2 MB. */
  async downloadImage(url: string): Promise<Buffer> {
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new InstagramApiError('Sem resposta ao baixar a imagem', 0);
    }
    if (!res.ok) {
      throw new InstagramApiError(
        `Erro ${res.status} ao baixar a imagem`,
        res.status,
      );
    }
    const declared = Number(res.headers.get('content-length'));
    if (declared > MAX_AVATAR_BYTES) {
      throw new InstagramApiError('Imagem grande demais', 413);
    }
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > MAX_AVATAR_BYTES) {
      throw new InstagramApiError('Imagem grande demais', 413);
    }
    return body;
  }

  /**
   * Prepara uma imagem na Meta (contêiner). A Meta baixa a imagem do `imageUrl`, que precisa
   * ser público e JPEG. Item de carrossel vai sem legenda.
   */
  async createImageContainer(
    igUserId: string,
    token: string,
    image: { imageUrl: string; caption?: string; carouselItem?: boolean },
  ): Promise<string> {
    const params: Record<string, string> = { image_url: image.imageUrl };
    if (image.carouselItem) params.is_carousel_item = 'true';
    else if (image.caption) params.caption = image.caption;
    return this.post(`${igUserId}/media`, token, params);
  }

  /** Junta os contêineres das imagens (2 a 10, na ordem) num carrossel. */
  async createCarouselContainer(
    igUserId: string,
    token: string,
    carousel: { children: string[]; caption?: string },
  ): Promise<string> {
    const params: Record<string, string> = {
      media_type: 'CAROUSEL',
      children: carousel.children.join(','),
    };
    if (carousel.caption) params.caption = carousel.caption;
    return this.post(`${igUserId}/media`, token, params);
  }

  async getContainerStatus(
    containerId: string,
    token: string,
  ): Promise<ContainerStatus> {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/${containerId}`,
    );
    url.search = new URLSearchParams({
      fields: 'status_code',
      access_token: token,
    }).toString();
    const body = await this.request(url);
    return requireString(body.status_code, 'status_code') as ContainerStatus;
  }

  /** Publica o contêiner no perfil. Devolve o ID do post no Instagram. */
  async publishContainer(
    igUserId: string,
    token: string,
    containerId: string,
  ): Promise<string> {
    return this.post(`${igUserId}/media_publish`, token, {
      creation_id: containerId,
    });
  }

  /** Link público do post publicado (ex.: https://www.instagram.com/p/...). */
  async getPermalink(mediaId: string, token: string): Promise<string | null> {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/${mediaId}`,
    );
    url.search = new URLSearchParams({
      fields: 'permalink',
      access_token: token,
    }).toString();
    return optionalString((await this.request(url)).permalink);
  }

  /**
   * Posts que estão no perfil agora, do mais recente ao mais antigo, até chegar em `since` (ou
   * acabar o perfil, ou `maxPages` páginas). Apagado ou arquivado no Instagram não aparece.
   * `complete`: chegou em `since` ou no fim do perfil (quem não está na lista saiu mesmo).
   */
  async listProfileMedia(
    token: string,
    since: Date,
    maxPages = 10,
  ): Promise<ProfileMedia> {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/media`,
    );
    url.search = new URLSearchParams({
      fields: 'id,timestamp',
      limit: '50',
      access_token: token,
    }).toString();

    const ids = new Set<string>();
    let next: string | null = url.toString();
    let oldest: Date | null = null;
    for (let page = 0; next && page < maxPages; page++) {
      const body = await this.request(next);
      const items = Array.isArray(body.data) ? (body.data as Json[]) : [];
      for (const item of items) {
        const id = optionalString(item.id);
        if (id) ids.add(id);
        const at = new Date(String(item.timestamp));
        if (!Number.isNaN(at.getTime())) oldest = at;
      }
      if (oldest && oldest < since) return { ids, complete: true, oldest };
      const paging = body.paging as Json | undefined;
      next = paging ? optionalString(paging.next) : null;
    }
    return { ids, complete: next === null, oldest };
  }

  /** POST na Graph API que devolve `{ id }` */
  private async post(
    path: string,
    token: string,
    params: Record<string, string>,
  ): Promise<string> {
    const body = await this.request(
      `https://graph.instagram.com/${GRAPH_VERSION}/${path}`,
      {
        method: 'POST',
        body: new URLSearchParams({ ...params, access_token: token }),
      },
    );
    return requireString(body.id, 'id');
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
    const { message, code, error_subcode } = error as Json;
    return new InstagramApiError(
      typeof message === 'string' ? message : `Erro ${status} da Meta`,
      status,
      typeof code === 'number' ? code : undefined,
      typeof error_subcode === 'number' ? error_subcode : undefined,
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
