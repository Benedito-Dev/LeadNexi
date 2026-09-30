export interface InstagramAccount {
  username: string
  name: string | null
  profilePictureUrl: string | null
  tokenExpiresAt: string
  createdAt: string
  /** O token não vale mais (revogado ou vencido): precisa conectar de novo para publicar */
  needsReconnect: boolean
}

/** GET /instagram/account */
export type InstagramAccountStatus = { connected: false } | { connected: true; account: InstagramAccount }

export type InstagramPostStatus = 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED'

export interface InstagramPostImage {
  id: string
  width: number
  height: number
  /** Link assinado (vale 1 hora) */
  url: string
}

/** GET /instagram/posts */
export interface InstagramPost {
  id: string
  caption: string
  scheduledAt: string
  status: InstagramPostStatus
  /** Motivo da falha, quando status = FAILED */
  error: string | null
  publishedAt: string | null
  /** Link do post no Instagram, depois de publicado */
  permalink: string | null
  createdAt: string
  /** Na ordem do carrossel: a primeira é a capa */
  images: InstagramPostImage[]
}

/** POST /instagram/posts: o post criado; `alarmFailed` = o despertador não respondeu ao agendar */
export type CreatedInstagramPost = InstagramPost & { alarmFailed?: boolean }

export interface CreateInstagramPostInput {
  caption: string
  mediaIds: string[]
  /** ISO 8601 (para agendar) */
  scheduledAt?: string
  /** Publicar na hora: a resposta já vem publicada ou com o motivo da falha */
  publishNow?: boolean
}

/** GET /instagram/publishing: os agendados saem sozinhos na hora marcada? */
export interface InstagramPublishing {
  automatic: boolean
}

/** GET /instagram/settings: app da Meta usado no login (a chave secreta nunca vem) */
export interface InstagramAppSettings {
  appId: string | null
  secretSaved: boolean
  /** tela: salvo pela tela · servidor: variáveis INSTAGRAM_* · null: nada configurado */
  source: 'tela' | 'servidor' | null
  configured: boolean
  /** Endereço a cadastrar no app da Meta (URLs de redirecionamento OAuth) */
  redirectUri: string
}

export interface SaveInstagramAppSettingsInput {
  appId: string
  /** Vazio: mantém a chave já salva */
  appSecret?: string
}
