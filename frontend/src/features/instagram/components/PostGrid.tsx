import { Images } from 'lucide-react'
import { formatDateTime } from '../../../lib/format.ts'
import { POST_STATUS, postDate } from '../status.ts'
import type { InstagramPost } from '../types.ts'
import { StatusIcon } from './StatusIcon.tsx'

// Posts em grade (BRAND.md, seção 9.5), como o perfil do Instagram: 3 colunas de capas 4:5.
// Sobre a capa, selos `backdrop` + `on-accent`: status (com o horário a partir do sm) embaixo e a
// contagem do carrossel em cima. Falhou ganha contorno `danger`. Clicar abre os detalhes.
export function PostGrid({ posts, onOpen }: { posts: InstagramPost[]; onOpen: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-1 sm:gap-2">
      {posts.map((post) => (
        <li key={post.id}>
          <PostTile post={post} onOpen={() => onOpen(post.id)} />
        </li>
      ))}
    </ul>
  )
}

function PostTile({ post, onOpen }: { post: InstagramPost; onOpen: () => void }) {
  const cover = post.images[0]
  const status = POST_STATUS[post.status]
  const when = formatDateTime(postDate(post))
  // Agendado mostra quando sai; os outros, o status
  const badge = post.status === 'SCHEDULED' ? when : status.label

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${status.label}, ${when}. ${post.caption || 'Sem legenda'}`}
      className={`relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-sm bg-navy-750 ${
        post.status === 'FAILED' ? 'ring-2 ring-danger ring-offset-2 ring-offset-navy' : ''
      }`}
    >
      {cover && <img src={cover.url} alt="" className="size-full object-cover transition-opacity hover:opacity-90" />}
      {post.images.length > 1 && (
        <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-backdrop px-1.5 py-0.5 text-xs font-bold text-on-accent tabular-nums">
          <Images aria-hidden size={12} strokeWidth={2} />
          {post.images.length}
        </span>
      )}
      {/* No celular o selo fica só com o ícone (a capa é pequena demais para o texto) */}
      <span className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded-full bg-backdrop px-1.5 py-1 text-xs font-bold text-on-accent sm:px-2 sm:py-0.5">
        <StatusIcon status={post.status} className="shrink-0" />
        <span className="hidden truncate sm:inline">{badge}</span>
      </span>
    </button>
  )
}
