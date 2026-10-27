import { ImageOff, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dataDoPost, SITUACOES_DO_POST } from '../situacoes'
import type { Post } from '../tipos'
import { IconeDaSituacao } from './IconeDaSituacao'

/**
 * O perfil como vai ficar: grade de 3 colunas no 4:5, do mais novo para o mais antigo, como no
 * Instagram. Os que ainda não saíram vêm no topo com a data marcada; publicados, limpos.
 */
export function FeedDoPerfil({ posts, onAbrir }: { posts: Post[] | null; onAbrir: (post: Post) => void }) {
  if (!posts) {
    return (
      <div aria-busy="true" aria-label="Carregando o feed" className="mx-auto grid w-full max-w-4xl grid-cols-3 gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="aspect-[4/5] animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }
  // Removidos do Instagram não aparecem no perfil
  const noPerfil = posts.filter((p) => p.status !== 'REMOVED').sort((a, b) => dataDoPost(b).localeCompare(dataDoPost(a)))
  if (noPerfil.length === 0) {
    return <p className="m-0 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm font-medium text-muted-foreground">Nenhum post ainda.</p>
  }

  return (
    <section aria-label="Feed do perfil" className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="m-0 text-xs font-medium text-muted-foreground">Como o seu perfil vai ficar: os agendados entram no topo, na ordem em que saem.</p>
      <ul className="m-0 grid grid-cols-3 gap-1.5 p-0">
        {noPerfil.map((post) => (
          <QuadroDoFeed key={post.id} post={post} onAbrir={() => onAbrir(post)} />
        ))}
      </ul>
    </section>
  )
}

function QuadroDoFeed({ post, onAbrir }: { post: Post; onAbrir: () => void }) {
  const situacao = SITUACOES_DO_POST[post.status]
  const capa = post.images[0]
  const publicado = post.status === 'PUBLISHED'
  const quando = new Date(dataDoPost(post)).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`${situacao.rotulo}, ${quando}: ${post.caption || 'sem legenda'}`}
        className={cn('group relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-muted', !publicado && 'ring-2 ring-inset ring-offset-0', post.status === 'FAILED' ? 'ring-leadnexi-danger/70' : !publicado && 'ring-leadnexi-violet/50')}
      >
        {capa ? (
          <img src={capa.url} alt="" className={cn('h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]', !publicado && 'opacity-90')} />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageOff aria-hidden className="h-6 w-6" strokeWidth={1.75} />
          </span>
        )}
        {post.images.length > 1 && (
          <Layers aria-hidden className="absolute right-2 top-2 h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" strokeWidth={2} />
        )}
        {/* Ainda não saiu: a data marcada embaixo, como uma etiqueta */}
        {!publicado && (
          <span className={cn('absolute inset-x-2 bottom-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-white/95 px-2 py-1 text-xs font-bold shadow-sm', situacao.cor)}>
            <IconeDaSituacao situacao={post.status} />
            <span className="truncate text-neutral-900">{post.status === 'FAILED' ? 'Não publicado' : quando}</span>
          </span>
        )}
        <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      </button>
    </li>
  )
}
