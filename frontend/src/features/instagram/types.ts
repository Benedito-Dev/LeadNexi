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
