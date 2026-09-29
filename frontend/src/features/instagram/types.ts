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
  createdAt: string
  /** Na ordem do carrossel: a primeira é a capa */
  images: InstagramPostImage[]
}

export interface CreateInstagramPostInput {
  caption: string
  scheduledAt: string
  mediaIds: string[]
}
