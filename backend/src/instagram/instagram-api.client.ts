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

/** O perfil como aparece no app: números, bio e os últimos posts (ver getProfileOverview) */
export interface ProfileOverview {
  username: string;
  name: string | null;
  biography: string | null;
  website: string | null;
  profilePictureUrl: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  media: {
    id: string;
    /** IMAGE, VIDEO (Reels) ou CAROUSEL_ALBUM */
    type: string;
    /** Imagem a mostrar (no vídeo, a capa); o link da Meta expira em poucos dias */
    imageUrl: string | null;
    permalink: string | null;
    timestamp: string | null;
  }[];
}

/** Post do perfil com os contadores públicos (ver listMediaWithCounts) */
export interface MediaWithCounts {
  id: string;
  /** IMAGE, VIDEO (Reels) ou CAROUSEL_ALBUM */
  type: string;
  caption: string | null;
  /** Imagem a mostrar (no vídeo, a capa); o link da Meta expira em poucos dias */
  imageUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likes: number | null;
  comments: number | null;
}

/** Seguidores ganhos e perdidos num período (follows_and_unfollows) */
export interface FollowsInPeriod {
  follows: number | null;
  unfollows: number | null;
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

  /** O perfil como aparece no app, na hora: números, bio, link e os últimos `limit` posts. */
  async getProfileOverview(
    token: string,
    limit = 30,
  ): Promise<ProfileOverview> {
    const perfil = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);
    perfil.search = new URLSearchParams({
      fields:
        'username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count',
      access_token: token,
    }).toString();
    const posts = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/media`,
    );
    posts.search = new URLSearchParams({
      fields: 'id,media_type,media_url,thumbnail_url,permalink,timestamp',
      limit: String(limit),
      access_token: token,
    }).toString();
    const [dados, lista] = await Promise.all([
      this.request(perfil),
      this.request(posts),
    ]);
    const numero = (valor: unknown) =>
      typeof valor === 'number' ? valor : null;
    const itens = Array.isArray(lista.data) ? (lista.data as Json[]) : [];
    return {
      username: requireString(dados.username, 'username'),
      name: optionalString(dados.name),
      biography: optionalString(dados.biography),
      website: optionalString(dados.website),
      profilePictureUrl: optionalString(dados.profile_picture_url),
      followers: numero(dados.followers_count),
      following: numero(dados.follows_count),
      posts: numero(dados.media_count),
      media: itens.flatMap((item) => {
        const id = optionalString(item.id);
        if (!id) return [];
        const type = optionalString(item.media_type) ?? 'IMAGE';
        return [
          {
            id,
            type,
            imageUrl:
              type === 'VIDEO'
                ? optionalString(item.thumbnail_url)
                : optionalString(item.media_url),
            permalink: optionalString(item.permalink),
            timestamp: optionalString(item.timestamp),
          },
        ];
      }),
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
          subscribed_fields: 'messages,message_reactions',
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

  /**
   * Manda um texto no direct para quem já conversou com a conta (IGSID). Só dentro da janela de
   * 24 h depois da última mensagem da pessoa. Com `replyToMid`, sai como resposta citando aquela
   * mensagem. Devolve o ID da mensagem (o mesmo do eco).
   */
  async sendTextMessage(
    token: string,
    recipientId: string,
    text: string,
    replyToMid?: string,
  ): Promise<string> {
    const body = await this.request(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          ...(replyToMid && { reply_to: { mid: replyToMid } }),
        }),
      },
    );
    return requireString(body.message_id, 'message_id');
  }

  /**
   * Reage a uma mensagem do direct (pelo ID dela na Meta) ou tira a reação. O Instagram só aceita
   * o coração ("love") pela API; mesma janela de 24 h do texto.
   */
  async sendReaction(
    token: string,
    recipientId: string,
    messageId: string,
    react: boolean,
  ): Promise<void> {
    await this.request(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: react ? 'react' : 'unreact',
          payload: react
            ? { message_id: messageId, reaction: 'love' }
            : { message_id: messageId },
        }),
      },
    );
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

  /**
   * Prepara um Reel na Meta: ela baixa o vídeo do `videoUrl` e a capa do `coverUrl` (links
   * públicos). `share_to_feed`: aparece também no feed do perfil, não só na aba Reels.
   */
  async createReelContainer(
    igUserId: string,
    token: string,
    reel: { videoUrl: string; coverUrl: string; caption?: string },
  ): Promise<string> {
    const params: Record<string, string> = {
      media_type: 'REELS',
      video_url: reel.videoUrl,
      cover_url: reel.coverUrl,
      share_to_feed: 'true',
    };
    if (reel.caption) params.caption = reel.caption;
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

  /** Os últimos `limit` posts do perfil, com legenda, curtidas e comentários. */
  async listMediaWithCounts(
    token: string,
    limit: number,
  ): Promise<MediaWithCounts[]> {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/media`,
    );
    url.search = new URLSearchParams({
      fields:
        'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: String(limit),
      access_token: token,
    }).toString();
    const body = await this.request(url);
    const items = Array.isArray(body.data) ? (body.data as Json[]) : [];
    return items.flatMap((item) => {
      const id = optionalString(item.id);
      if (!id) return [];
      const type = optionalString(item.media_type) ?? 'IMAGE';
      return [
        {
          id,
          type,
          caption: optionalString(item.caption),
          imageUrl:
            type === 'VIDEO'
              ? optionalString(item.thumbnail_url)
              : optionalString(item.media_url),
          permalink: optionalString(item.permalink),
          timestamp: optionalString(item.timestamp),
          likes: optionalNumber(item.like_count),
          comments: optionalNumber(item.comments_count),
        },
      ];
    });
  }

  /**
   * Estatísticas de um post (permissão instagram_business_manage_insights). Devolve o valor de
   * cada métrica pedida que a Meta respondeu; métrica que não vale para o tipo de post faz a
   * Meta recusar a chamada inteira, então quem chama pede só as que servem.
   */
  async getMediaInsights(
    mediaId: string,
    token: string,
    metrics: string[],
  ): Promise<Record<string, number>> {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/${mediaId}/insights`,
    );
    url.search = new URLSearchParams({
      metric: metrics.join(','),
      access_token: token,
    }).toString();
    const body = await this.request(url);
    const items = Array.isArray(body.data) ? (body.data as Json[]) : [];
    const values: Record<string, number> = {};
    for (const item of items) {
      const name = optionalString(item.name);
      const first = Array.isArray(item.values)
        ? (item.values[0] as Json | undefined)
        : undefined;
      const value = optionalNumber(first?.value);
      if (name && value !== null) values[name] = value;
    }
    return values;
  }

  /** Total de uma métrica da conta entre `since` e `until` (no máximo 30 dias, regra da Meta). */
  async getAccountInsight(
    token: string,
    metric: string,
    since: Date,
    until: Date,
  ): Promise<number | null> {
    const body = await this.request(this.accountInsightsUrl(token, metric, since, until));
    const item = Array.isArray(body.data) ? (body.data[0] as Json | undefined) : undefined;
    const total = item?.total_value as Json | undefined;
    return optionalNumber(total?.value);
  }

  /** Seguidores ganhos e perdidos no período (a Meta separa por follow_type). */
  async getFollowsInPeriod(
    token: string,
    since: Date,
    until: Date,
  ): Promise<FollowsInPeriod> {
    const url = this.accountInsightsUrl(token, 'follows_and_unfollows', since, until);
    url.searchParams.set('breakdown', 'follow_type');
    const body = await this.request(url);
    const item = Array.isArray(body.data) ? (body.data[0] as Json | undefined) : undefined;
    const total = item?.total_value as Json | undefined;
    const breakdown = Array.isArray(total?.breakdowns)
      ? (total.breakdowns[0] as Json | undefined)
      : undefined;
    const results = Array.isArray(breakdown?.results)
      ? (breakdown.results as Json[])
      : [];
    const of = (type: string) => {
      const row = results.find(
        (r) => Array.isArray(r.dimension_values) && r.dimension_values[0] === type,
      );
      return row ? optionalNumber(row.value) : null;
    };
    // FOLLOWER: quem passou a seguir · NON_FOLLOWER: quem deixou de seguir
    return { follows: of('FOLLOWER'), unfollows: of('NON_FOLLOWER') };
  }

  private accountInsightsUrl(
    token: string,
    metric: string,
    since: Date,
    until: Date,
  ) {
    const url = new URL(
      `https://graph.instagram.com/${GRAPH_VERSION}/me/insights`,
    );
    url.search = new URLSearchParams({
      metric,
      period: 'day',
      metric_type: 'total_value',
      since: String(Math.floor(since.getTime() / 1000)),
      until: String(Math.floor(until.getTime() / 1000)),
      access_token: token,
    }).toString();
    return url;
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

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
