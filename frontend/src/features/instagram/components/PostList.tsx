import { CalendarClock, CircleAlert, CircleCheck, Images, LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { ApiError } from '../../../lib/api.ts'
import { formatDateTime } from '../../../lib/format.ts'
import { useCancelPost, useInstagramPosts } from '../hooks.ts'
import type { InstagramPost, InstagramPostStatus } from '../types.ts'

const STATUS: Record<InstagramPostStatus, { label: string; tone: string }> = {
  SCHEDULED: { label: 'Agendado', tone: 'text-slate-300' },
  PUBLISHING: { label: 'Publicando', tone: 'text-slate-300' },
  PUBLISHED: { label: 'Publicado', tone: 'text-success' },
  FAILED: { label: 'Falhou', tone: 'text-danger' },
}

// Posts do Instagram (BRAND.md, seção 9.5): do mais próximo ao mais distante, com capa, legenda,
// quando sai, status e "Cancelar" (confirma com segundo clique) enquanto não foi publicado.
export function PostList() {
  const posts = useInstagramPosts()

  if (posts.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando posts" className="flex flex-col gap-2">
        {[0, 1].map((row) => (
          <div key={row} className="h-20 animate-pulse rounded-xl border bg-navy-800" />
        ))}
      </div>
    )
  }
  if (posts.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-body text-slate-400">Não foi possível carregar os posts.</p>
        <Button variant="secondary" onClick={() => void posts.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  if (posts.data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed px-6 py-10">
        <CalendarClock aria-hidden size={22} strokeWidth={1.75} className="text-slate-400" />
        <p className="text-ui font-bold text-white">Nenhum post agendado ainda.</p>
        <p className="text-small text-slate-400">Clique em "Novo post" para montar o primeiro.</p>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {posts.data.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </ul>
  )
}

function PostItem({ post }: { post: InstagramPost }) {
  const cancel = useCancelPost()
  const [confirming, setConfirming] = useState(false)
  const cover = post.images[0]
  const status = STATUS[post.status]
  const cancelable = post.status === 'SCHEDULED' || post.status === 'FAILED'
  const cancelError =
    cancel.error instanceof ApiError && cancel.error.status === 409
      ? cancel.error.message
      : cancel.error
        ? 'Não foi possível cancelar. Tente de novo.'
        : null

  return (
    <li className="flex items-start gap-4 rounded-xl border bg-navy-800 p-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-navy-750">
        {cover && <img src={cover.url} alt="" className="size-full object-cover" />}
        {post.images.length > 1 && (
          <span className="absolute right-1 bottom-1 flex items-center gap-0.5 rounded-full bg-backdrop px-1.5 py-0.5 text-xs font-bold text-on-accent tabular-nums">
            <Images aria-hidden size={12} strokeWidth={2} />
            {post.images.length}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 text-ui ${post.caption ? 'text-white' : 'text-slate-400'}`}>
          {post.caption || 'Sem legenda'}
        </p>
        {/* No celular a linha quebra: os "·" somem para não ficarem soltos no fim da linha */}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-slate-400 sm:gap-x-2">
          <span className={`inline-flex items-center gap-1 font-bold ${status.tone}`}>
            <StatusIcon status={post.status} />
            {status.label}
          </span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>{formatDateTime(post.scheduledAt)}</span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>{post.images.length > 1 ? `Carrossel · ${post.images.length} imagens` : 'Foto'}</span>
        </p>
        {post.status === 'FAILED' && post.error && <p className="mt-1 text-small text-danger">{post.error}</p>}
        {cancelError && (
          <p role="alert" className="mt-1 text-small text-danger">
            {cancelError}
          </p>
        )}
      </div>

      {cancelable && (
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={() => (confirming ? cancel.mutate(post.id) : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          title="Cancelar post"
          className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3 text-small transition-colors hover:bg-navy-750 disabled:cursor-not-allowed ${
            confirming ? 'text-danger' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          {cancel.isPending ? (
            <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <X aria-hidden size={16} strokeWidth={1.75} />
          )}
          {/* No celular fica só o ícone (o texto segue para leitores de tela); "Confirmar" sempre aparece */}
          {confirming ? 'Confirmar' : <span className="sr-only sm:not-sr-only">Cancelar</span>}
        </button>
      )}
    </li>
  )
}

function StatusIcon({ status }: { status: InstagramPostStatus }) {
  const props = { 'aria-hidden': true, size: 14, strokeWidth: 1.75 } as const
  if (status === 'PUBLISHING') return <LoaderCircle {...props} className="animate-spin" />
  if (status === 'PUBLISHED') return <CircleCheck {...props} />
  if (status === 'FAILED') return <CircleAlert {...props} />
  return <CalendarClock {...props} />
}
