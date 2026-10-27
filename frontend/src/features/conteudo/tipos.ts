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
