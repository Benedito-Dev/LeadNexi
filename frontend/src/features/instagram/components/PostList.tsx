import {
  CalendarClock,
  ExternalLink,
  Images,
  LoaderCircle,
  RotateCw,
  Send,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { formatDateTime } from '../../../lib/format.ts'
import {
  useCancelPost,
  useInstagramPosts,
  useInstagramPublishing,
  usePublishPost,
  useSyncInstagramPosts,
} from '../hooks.ts'
import { actionErrorMessage, isPending, POST_STATUS, postDate } from '../status.ts'
import type { InstagramPost } from '../types.ts'
import type { PostView } from '../view.ts'
import { PostDetails } from './PostDetails.tsx'
import { GRID_COLUMNS, PostGrid } from './PostGrid.tsx'
import { StatusIcon } from './StatusIcon.tsx'

// Posts do Instagram (BRAND.md, seção 9.5): primeiro os que ainda não saíram (do mais próximo ao mais
// distante), depois os publicados. Em lista: capa, legenda, quando sai, status e as ações ("Publicar
// agora" ou "Tentar de novo" e "Cancelar" enquanto não saiu, "Ver no Instagram" depois de publicado,
// "Tirar da lista" se foi apagado no Instagram). Em grade: só as capas; clicar abre os detalhes.
// Abrir a tela confere os publicados com o perfil (apagado lá vira "Removido do Instagram").
export function PostList({ view }: { view: PostView }) {
  const posts = useInstagramPosts()
  const publishing = useInstagramPublishing()
  useSyncInstagramPosts()
  // Post aberto nos detalhes (pela grade). Se ele sumir da lista (cancelado), o painel fecha.
  const [openId, setOpenId] = useState<string | null>(null)

  if (posts.isPending) {
    return view === 'grade' ? (
      <div className="@container">
        <div aria-busy="true" aria-label="Carregando posts" className={GRID_COLUMNS}>
          {[0, 1, 2].map((tile) => (
            <div key={tile} className="aspect-[4/5] animate-pulse rounded-sm bg-navy-800" />
          ))}
        </div>
      </div>
    ) : (
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
  const waiting = posts.data.some((post) => post.status === 'SCHEDULED')
  return (
    <>
      {waiting && publishing.data?.automatic === false && (
        <p className="flex items-start gap-2 text-small text-slate-300">
          <TriangleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0 text-warning" />
          Com a publicação automática desligada, os posts agendados não saem sozinhos. Use "Publicar agora" em cada um.
        </p>
      )}
      {view === 'grade' ? (
        <div className="@container">
          <PostGrid posts={posts.data} onOpen={setOpenId} />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.data.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
        </ul>
      )}
      <PostDetails post={posts.data.find((post) => post.id === openId)} onClose={() => setOpenId(null)} />
    </>
  )
}

function PostItem({ post }: { post: InstagramPost }) {
  const cancel = useCancelPost()
  const publish = usePublishPost()
  const cover = post.images[0]
  const status = POST_STATUS[post.status]
  const pending = isPending(post)
  const busy = cancel.isPending || publish.isPending
  const actionError =
    actionErrorMessage(
      cancel.error,
      post.status === 'REMOVED'
        ? 'Não foi possível tirar da lista. Tente de novo.'
        : 'Não foi possível cancelar. Tente de novo.',
    ) ??
    actionErrorMessage(publish.error, 'Não foi possível publicar. Tente de novo.')

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
          {/* Publicado: quando saiu; nos outros, quando está marcado para sair */}
          <span>{formatDateTime(postDate(post))}</span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>{post.images.length > 1 ? `Carrossel · ${post.images.length} imagens` : 'Foto'}</span>
        </p>
        {post.status === 'FAILED' && post.error && <p className="mt-1 text-small text-danger">{post.error}</p>}
        {post.status === 'REMOVED' && (
          <p className="mt-1 text-small text-slate-400">Não está mais no seu perfil (apagado ou arquivado).</p>
        )}
        {actionError && (
          <p role="alert" className="mt-1 text-small text-danger">
            {actionError}
          </p>
        )}
      </div>

      {post.status === 'PUBLISHED' && post.permalink && (
        <a
          href={post.permalink}
          target="_blank"
          rel="noreferrer"
          title="Ver no Instagram"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-small text-cyan transition-colors hover:bg-navy-750"
        >
          <ExternalLink aria-hidden size={16} strokeWidth={1.75} />
          <span className="sr-only sm:not-sr-only">Ver no Instagram</span>
        </a>
      )}
      {post.status === 'REMOVED' && (
        <div className="flex shrink-0">
          <ConfirmButton
            label="Tirar da lista"
            icon={Trash2}
            danger
            pending={cancel.isPending}
            disabled={busy}
            onConfirm={() => cancel.mutate(post.id)}
          />
        </div>
      )}
      {pending && (
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
          <ConfirmButton
            label={post.status === 'FAILED' ? 'Tentar de novo' : 'Publicar agora'}
            icon={post.status === 'FAILED' ? RotateCw : Send}
            pending={publish.isPending}
            disabled={busy}
            onConfirm={() => publish.mutate(post.id)}
          />
          <ConfirmButton
            label="Cancelar"
            title="Cancelar post"
            icon={X}
            danger
            pending={cancel.isPending}
            disabled={busy}
            onConfirm={() => cancel.mutate(post.id)}
          />
        </div>
      )}
    </li>
  )
}

/**
 * Ação que confirma com segundo clique ("Confirmar"). No celular fica só o ícone (o texto segue
 * para leitores de tela); "Confirmar" sempre aparece.
 */
function ConfirmButton({
  label,
  title = label,
  icon: Icon,
  danger = false,
  pending,
  disabled,
  onConfirm,
}: {
  label: string
  title?: string
  icon: LucideIcon
  /** Ação destrutiva: "Confirmar" em vermelho */
  danger?: boolean
  pending: boolean
  disabled: boolean
  onConfirm: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!confirming) return setConfirming(true)
        setConfirming(false)
        onConfirm()
      }}
      onBlur={() => setConfirming(false)}
      title={title}
      className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm px-3 text-small transition-colors hover:bg-navy-750 disabled:cursor-not-allowed ${
        confirming ? (danger ? 'text-danger' : 'text-white') : 'text-slate-400 hover:text-slate-300'
      }`}
    >
      {pending ? (
        <LoaderCircle aria-hidden size={16} strokeWidth={1.75} className="animate-spin" />
      ) : (
        <Icon aria-hidden size={16} strokeWidth={1.75} />
      )}
      {confirming ? 'Confirmar' : <span className="sr-only sm:not-sr-only">{label}</span>}
    </button>
  )
}
