import { FileText, Layers } from 'lucide-react'
import type { Post } from '../tipos'

/**
 * Rascunhos (posts sem data) numa faixa acima do calendário: a capa, o começo da legenda e quantas
 * imagens. Clicar abre os detalhes, onde se agenda ou apaga. Sem rascunho, a faixa some.
 */
export function BandejaDeRascunhos({ rascunhos, onAbrir }: { rascunhos: Post[]; onAbrir: (post: Post) => void }) {
  if (rascunhos.length === 0) return null
  return (
    <section aria-labelledby="rascunhos" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 id="rascunhos" className="m-0 flex items-center gap-2 text-sm font-extrabold text-foreground">
        <FileText aria-hidden className="h-4 w-4 text-leadnexi-violet-texto" strokeWidth={1.75} />
        Rascunhos
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">{rascunhos.length}</span>
        <span className="font-medium text-muted-foreground">· sem data: abra para agendar</span>
      </h2>
      <ul className="no-scrollbar -mx-1 m-0 flex gap-3 overflow-x-auto p-0 px-1 pb-1">
        {rascunhos.map((post) => {
          const capa = post.images[0]
          const legenda = post.caption.replace(/#[\p{L}\p{N}_]+/gu, '').trim()
          return (
            <li key={post.id} className="list-none">
              <button
                type="button"
                onClick={() => onAbrir(post)}
                className="group flex w-56 shrink-0 gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:border-leadnexi-violet/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan"
              >
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {capa && <img src={capa.url} alt="" className="h-full w-full object-cover" />}
                  {post.images.length > 1 && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-[hsl(var(--sidebar-bg))]/80 text-white">
                      <Layers aria-hidden className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">{legenda || 'Sem legenda'}</span>
                  <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                    {post.images.length > 1 ? `Carrossel · ${post.images.length} imagens` : 'Foto'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
