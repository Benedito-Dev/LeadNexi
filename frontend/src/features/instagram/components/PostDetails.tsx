import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  RotateCw,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Drawer } from '../../../components/ui/Drawer.tsx'
import { formatDateTime } from '../../../lib/format.ts'
import { useCancelPost, usePublishPost } from '../hooks.ts'
import { actionErrorMessage, isPending, POST_STATUS, postDate } from '../status.ts'
import type { InstagramPost, InstagramPostStatus } from '../types.ts'
import { StatusIcon } from './StatusIcon.tsx'

const TITLES: Record<InstagramPostStatus, string> = {
  SCHEDULED: 'Post agendado',
  PUBLISHING: 'Publicando post',
  PUBLISHED: 'Post publicado',
  FAILED: 'Post não publicado',
  REMOVED: 'Post removido do Instagram',
}

// Detalhes do post (BRAND.md, seção 9.5), aberto pela grade: imagens (carrossel com setas e
// contador), status, legenda completa e as ações no rodapé. Cancelado, o post some e o painel fecha.
export function PostDetails({ post, onClose }: { post: InstagramPost | undefined; onClose: () => void }) {
  return (
    <Drawer open={post !== undefined} onClose={onClose} label="Detalhes do post">
      {post && <DetailsContent key={post.id} post={post} onClose={onClose} />}
    </Drawer>
  )
}

function DetailsContent({ post, onClose }: { post: InstagramPost; onClose: () => void }) {
  const status = POST_STATUS[post.status]

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-h2">{TITLES[post.status]}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
        >
          <X aria-hidden size={20} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <ImageViewer images={post.images} />

        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-small text-slate-400">
            <span className={`inline-flex items-center gap-1 font-bold ${status.tone}`}>
              <StatusIcon status={post.status} />
              {status.label}
            </span>
            <span aria-hidden>·</span>
            <span>{formatDateTime(postDate(post))}</span>
            <span aria-hidden>·</span>
            <span>{post.images.length > 1 ? `Carrossel · ${post.images.length} imagens` : 'Foto'}</span>
          </p>
          {post.status === 'FAILED' && post.error && <p className="text-small text-danger">{post.error}</p>}
          {post.status === 'REMOVED' && (
            <p className="text-small text-slate-400">Não está mais no seu perfil (apagado ou arquivado).</p>
          )}
        </div>

        <section aria-labelledby="details-caption" className="flex flex-col gap-2">
          <h3 id="details-caption" className="text-ui font-bold text-white">
            Legenda
          </h3>
          <p className={`text-body whitespace-pre-wrap ${post.caption ? 'text-slate-300' : 'text-slate-400'}`}>
            {post.caption || 'Sem legenda'}
          </p>
        </section>
      </div>

      <DetailsActions post={post} />
    </>
  )
}

/** Imagem grande na proporção dela; carrossel com setas e "2/3" (como no Instagram). */
function ImageViewer({ images }: { images: InstagramPost['images'] }) {
  const [index, setIndex] = useState(0)
  const image = images[Math.min(index, images.length - 1)]
  if (!image) return null
  const carousel = images.length > 1

  return (
    <div className="relative overflow-hidden rounded-md bg-navy-750">
      <img
        src={image.url}
        alt={carousel ? `Imagem ${index + 1} de ${images.length}` : 'Imagem do post'}
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
        className="w-full object-cover"
      />
      {carousel && (
        <>
          <span className="absolute top-2 right-2 rounded-full bg-backdrop px-2 py-0.5 text-xs font-bold text-on-accent tabular-nums">
            {index + 1}/{images.length}
          </span>
          <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              aria-label="Imagem anterior"
              className="grid size-8 cursor-pointer place-items-center rounded-full bg-backdrop text-on-accent disabled:invisible"
            >
              <ChevronLeft aria-hidden size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={index === images.length - 1}
              onClick={() => setIndex(index + 1)}
              aria-label="Próxima imagem"
              className="grid size-8 cursor-pointer place-items-center rounded-full bg-backdrop text-on-accent disabled:invisible"
            >
              <ChevronRight aria-hidden size={18} strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Rodapé: enquanto não saiu, "Cancelar post" e "Publicar agora" (ou "Tentar de novo"), cada um
 * confirma com segundo clique; publicado, "Ver no Instagram"; removido do Instagram, "Tirar da lista".
 */
function DetailsActions({ post }: { post: InstagramPost }) {
  const cancel = useCancelPost()
  const publish = usePublishPost()
  const [confirming, setConfirming] = useState<'cancel' | 'publish' | null>(null)
  const busy = cancel.isPending || publish.isPending
  const error =
    actionErrorMessage(
      cancel.error,
      post.status === 'REMOVED'
        ? 'Não foi possível tirar da lista. Tente de novo.'
        : 'Não foi possível cancelar. Tente de novo.',
    ) ??
    actionErrorMessage(publish.error, 'Não foi possível publicar. Tente de novo.')

  function act(action: 'cancel' | 'publish') {
    if (confirming !== action) return setConfirming(action)
    setConfirming(null)
    if (action === 'cancel') cancel.mutate(post.id)
    else publish.mutate(post.id)
  }

  if (post.status === 'PUBLISHED' && post.permalink) {
    return (
      <footer className="flex justify-end border-t px-5 py-4">
        <a
          href={post.permalink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-navy-600 px-5 text-ui font-bold text-cyan transition-colors hover:bg-navy-750"
        >
          <ExternalLink aria-hidden size={18} strokeWidth={1.75} />
          Ver no Instagram
        </a>
      </footer>
    )
  }
  if (post.status === 'REMOVED') {
    return (
      <footer className="flex flex-col gap-3 border-t px-5 py-4">
        {error && (
          <p role="alert" className="flex items-start gap-2 text-small text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            variant={confirming === 'cancel' ? 'danger' : 'secondary'}
            disabled={busy}
            onClick={() => act('cancel')}
            onBlur={() => setConfirming(null)}
          >
            {cancel.isPending ? (
              <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Trash2 aria-hidden size={18} strokeWidth={1.75} />
            )}
            {confirming === 'cancel' ? 'Confirmar' : 'Tirar da lista'}
          </Button>
        </div>
      </footer>
    )
  }
  if (!isPending(post)) return null

  const retry = post.status === 'FAILED'
  return (
    <footer className="flex flex-col gap-3 border-t px-5 py-4">
      {error && (
        <p role="alert" className="flex items-start gap-2 text-small text-danger">
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button
          variant={confirming === 'cancel' ? 'danger' : 'secondary'}
          disabled={busy}
          onClick={() => act('cancel')}
          onBlur={() => setConfirming(null)}
        >
          {cancel.isPending && <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />}
          {confirming === 'cancel' ? 'Confirmar cancelamento' : 'Cancelar post'}
        </Button>
        <Button disabled={busy} onClick={() => act('publish')} onBlur={() => setConfirming(null)}>
          {publish.isPending ? (
            <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
          ) : retry ? (
            <RotateCw aria-hidden size={18} strokeWidth={1.75} />
          ) : (
            <Send aria-hidden size={18} strokeWidth={1.75} />
          )}
          {confirming === 'publish' ? 'Confirmar' : retry ? 'Tentar de novo' : 'Publicar agora'}
        </Button>
      </div>
    </footer>
  )
}
