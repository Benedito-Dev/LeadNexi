/** DRAFT: guardado sem data. REMOVED: publicado, mas apagado (ou arquivado) no Instagram depois */
export type SituacaoDoPost = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'REMOVED'

export type ImagemDoPost = {
  id: string
  width: number
  height: number
  /** Link assinado (vale 1 hora) */
  url: string
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
