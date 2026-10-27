import type { Post, SituacaoDoPost } from './tipos'

/** Rótulo e cor de cada situação do post. */
export const SITUACOES_DO_POST: Record<SituacaoDoPost, { rotulo: string; titulo: string; cor: string; barra: string }> = {
  SCHEDULED: { rotulo: 'Agendado', titulo: 'Post agendado', cor: 'text-leadnexi-violet-texto', barra: 'bg-leadnexi-violet' },
  PUBLISHING: { rotulo: 'Publicando', titulo: 'Publicando post', cor: 'text-leadnexi-cyan-texto', barra: 'bg-leadnexi-cyan' },
  PUBLISHED: { rotulo: 'Publicado', titulo: 'Post publicado', cor: 'text-success-foreground', barra: 'bg-success-foreground' },
  FAILED: { rotulo: 'Falhou', titulo: 'Post não publicado', cor: 'text-leadnexi-danger', barra: 'bg-leadnexi-danger' },
  REMOVED: { rotulo: 'Removido do Instagram', titulo: 'Post removido do Instagram', cor: 'text-muted-foreground', barra: 'bg-muted-foreground' },
}

/** Ordem das situações na legenda do calendário. */
export const ORDEM_DAS_SITUACOES: SituacaoDoPost[] = ['PUBLISHED', 'SCHEDULED', 'PUBLISHING', 'FAILED', 'REMOVED']

/** Ainda não saiu: dá para remarcar, publicar agora (ou tentar de novo) e cancelar. */
export const estaPendente = (post: Post) => post.status === 'SCHEDULED' || post.status === 'FAILED'

/** A data que importa: quando saiu (publicado) ou quando está marcado para sair. */
export const dataDoPost = (post: Post) => post.publishedAt ?? post.scheduledAt
