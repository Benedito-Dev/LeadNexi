export type ContaDoInstagram = {
  username: string
  name: string | null
  profilePictureUrl: string | null
  tokenExpiresAt: string
  createdAt: string
  /** O token não vale mais (revogado ou vencido): precisa conectar de novo para publicar */
  needsReconnect: boolean
  /** O direct vira lead (avisos de mensagem ligados); falso: conectar de novo dá a permissão */
  messagesEnabled: boolean
}

/** GET /instagram/account */
export type SituacaoDaConta = { connected: false } | { connected: true; account: ContaDoInstagram }

/** GET /instagram/settings: o app da Meta usado no login do Instagram. */
export type AppDaMeta = {
  appId: string | null
  secretSaved: boolean
  /** tela: salvo pela tela · servidor: variáveis INSTAGRAM_* · null: nada configurado */
  source: 'tela' | 'servidor' | null
  configured: boolean
  /** Endereço a cadastrar no app da Meta (URLs de redirecionamento OAuth) */
  redirectUri: string
  /** "Configurar webhooks" no app da Meta: URL de callback e token de verificação */
  webhookUrl: string
  webhookVerifyToken: string | null
}

/** Post que já está no perfil do Instagram (lido na hora na Meta). */
export type PostDoPerfil = {
  id: string
  /** IMAGE, VIDEO (Reels) ou CAROUSEL_ALBUM */
  type: string
  imageUrl: string | null
  permalink: string | null
  timestamp: string | null
}

/** GET /instagram/profile: o perfil como aparece no app. */
export type PerfilDoInstagram =
  | { connected: false; reason: string }
  | {
      connected: true
      profile: {
        username: string
        name: string | null
        biography: string | null
        website: string | null
        profilePictureUrl: string | null
        followers: number | null
        following: number | null
        posts: number | null
        media: PostDoPerfil[]
      }
    }
