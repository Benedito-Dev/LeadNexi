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
