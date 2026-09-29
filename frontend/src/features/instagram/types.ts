export interface InstagramAccount {
  username: string
  name: string | null
  profilePictureUrl: string | null
  tokenExpiresAt: string
  createdAt: string
}

/** GET /instagram/account */
export type InstagramAccountStatus = { connected: false } | { connected: true; account: InstagramAccount }
