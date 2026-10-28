/** DRAFT: guardado sem data. REMOVED: publicado, mas apagado (ou arquivado) no Instagram depois */
export type SituacaoDoPost = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'REMOVED'

export type ImagemDoPost = {
  id: string
  /** VIDEO: o post é um Reel (um vídeo só) */
  kind: 'IMAGE' | 'VIDEO'
  width: number
  height: number
  /** Link assinado (vale 1 hora). No vídeo, é a capa: as miniaturas continuam funcionando */
  url: string
  /** Só no vídeo: link para tocar */
  videoUrl: string | null
  durationMs: number | null
}

/** GET /instagram/posts */
export type Post = {
  id: string
  caption: string
  /** Vazio no rascunho */
  scheduledAt: string | null
  status: SituacaoDoPost
  /** Motivo da falha, quando status = FAILED */
  error: string | null
  publishedAt: string | null
  /** Link do post no Instagram, depois de publicado */
  permalink: string | null
  createdAt: string
  /** Na ordem do carrossel: a primeira é a capa */
  images: ImagemDoPost[]
}

/** Um número da conta no período escolhido e no período anterior, do mesmo tamanho */
export type NumeroDoPeriodo = { current: number | null; previous: number | null }

/** Post do perfil com as estatísticas (null: a Meta não informou) */
export type PostComNumeros = {
  id: string
  /** IMAGE, VIDEO (Reels) ou CAROUSEL_ALBUM */
  type: string
  caption: string | null
  /** Link da Meta (expira em poucos dias) */
  imageUrl: string | null
  permalink: string | null
  timestamp: string | null
  likes: number | null
  comments: number | null
  views: number | null
  reach: number | null
  saved: number | null
  shares: number | null
  interactions: number | null
  /** Só Reel, em milissegundos */
  avgWatchMs: number | null
}

/** GET /instagram/insights. sem-permissao: conta conectada antes da permissão de estatísticas */
export type Desempenho =
  | { status: 'sem-conta' }
  | { status: 'sem-permissao' }
  | { status: 'falha' }
  | {
      status: 'ok'
      days: 7 | 30
      followers: number | null
      account: Record<'reach' | 'views' | 'accounts_engaged' | 'total_interactions' | 'profile_views' | 'website_clicks', NumeroDoPeriodo>
      follows: { follows: number | null; unfollows: number | null } | null
      posts: PostComNumeros[]
    }
