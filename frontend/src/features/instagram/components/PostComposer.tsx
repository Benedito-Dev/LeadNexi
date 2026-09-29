import { ChevronLeft, ChevronRight, CircleAlert, ImagePlus, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Drawer } from '../../../components/ui/Drawer.tsx'
import { Textarea } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import {
  CAPTION_LIMIT,
  countHashtags,
  HASHTAG_LIMIT,
  MAX_IMAGES,
  prepareImage,
  type PreparedImage,
} from '../images.ts'

type Mode = 'now' | 'schedule'

/** "2026-10-02T09:00" no horário local, para o <input type="datetime-local"> */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Novo post (BRAND.md, seção 9.5): painel à direita com imagens (foto única ou carrossel), legenda
// e quando publicar. As imagens viram JPEG no navegador, já no formato que o Instagram aceita.
export function PostComposer({
  open,
  connected,
  onClose,
}: {
  open: boolean
  /** Sem conta conectada dá para montar o post, mas não publicar */
  connected: boolean
  onClose: () => void
}) {
  return (
    <Drawer open={open} onClose={onClose} label="Novo post">
      {open && <ComposerContent connected={connected} onClose={onClose} />}
    </Drawer>
  )
}

function ComposerContent({ connected, onClose }: { connected: boolean; onClose: () => void }) {
  const [images, setImages] = useState<PreparedImage[]>([])
  const [preparing, setPreparing] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [mode, setMode] = useState<Mode>('schedule')
  const [minDate] = useState(() => toLocalInput(new Date()))
  const [scheduledAt, setScheduledAt] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return toLocalInput(tomorrow)
  })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Libera as URLs locais das miniaturas ao fechar o painel
  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  })
  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), [])

  async function addFiles(files: FileList | null) {
    const picked = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))
    if (picked.length === 0) return
    const room = MAX_IMAGES - images.length
    setImageError(picked.length > room ? `Máximo de ${MAX_IMAGES} imagens por post.` : null)
    setPreparing(true)
    try {
      const prepared = await Promise.all(picked.slice(0, room).map(prepareImage))
      setImages((current) => [...current, ...prepared])
    } catch {
      setImageError('Não foi possível ler uma das imagens. Tente outro arquivo.')
    } finally {
      setPreparing(false)
    }
  }

  function remove(id: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === id)
      if (image) URL.revokeObjectURL(image.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  function move(index: number, step: -1 | 1) {
    setImages((current) => {
      const next = [...current]
      const [image] = next.splice(index, 1)
      if (image) next.splice(index + step, 0, image)
      return next
    })
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    void addFiles(event.dataTransfer.files)
  }

  const hashtags = countHashtags(caption)
  const badRatio = images.some((image) => !image.ratioOk)
  // O primeiro motivo que impede publicar, dito em português claro
  const blocker = !connected
    ? 'Conecte o Instagram para publicar.'
    : images.length === 0
      ? 'Adicione pelo menos uma imagem.'
      : badRatio
        ? 'Ajuste as imagens marcadas: a proporção precisa ficar entre 4:5 e 1,91:1.'
        : caption.length > CAPTION_LIMIT
          ? `A legenda passou de ${CAPTION_LIMIT} caracteres.`
          : hashtags > HASHTAG_LIMIT
            ? `Use no máximo ${HASHTAG_LIMIT} hashtags.`
            : mode === 'schedule' && !scheduledAt
              ? 'Escolha a data e a hora.'
              : 'O envio ao Instagram chega na próxima etapa.'

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-h2">Novo post</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
        >
          <X aria-hidden size={20} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        {/* Imagens */}
        <section aria-labelledby="images-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="images-title" className="text-ui font-bold text-white">
              Imagens
            </h3>
            <span className="text-small text-slate-400 tabular-nums">
              {images.length === 0
                ? `até ${MAX_IMAGES}`
                : images.length === 1
                  ? 'Foto única'
                  : `Carrossel · ${images.length} imagens`}
            </span>
          </div>

          {images.length < MAX_IMAGES && (
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-7 text-center transition-colors hover:border-navy-600 hover:bg-navy-750 ${
                dragging ? 'border-violet bg-navy-750' : ''
              }`}
            >
              {preparing ? (
                <LoaderCircle aria-hidden size={24} strokeWidth={1.75} className="animate-spin text-slate-400" />
              ) : (
                <ImagePlus aria-hidden size={24} strokeWidth={1.75} className="text-slate-400" />
              )}
              <span className="text-ui text-white">{preparing ? 'Preparando imagens…' : 'Arraste ou clique para escolher'}</span>
              <span className="text-small text-slate-400">JPG, PNG ou WebP · entre 4:5 e 1,91:1</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void addFiles(event.target.files)
                  event.target.value = ''
                }}
              />
            </label>
          )}

          {images.length > 0 && (
            <ol className="grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <li key={image.id} className="group/thumb relative aspect-square overflow-hidden rounded-sm bg-navy-750">
                  <img src={image.previewUrl} alt={image.name} className="size-full object-cover" />
                  <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-backdrop text-xs font-bold text-on-accent tabular-nums">
                    {index + 1}
                  </span>
                  {!image.ratioOk && (
                    <span
                      title="Proporção fora do permitido (entre 4:5 e 1,91:1)"
                      className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-warning text-navy"
                    >
                      <TriangleAlert aria-label="Proporção fora do permitido" size={12} strokeWidth={2} />
                    </span>
                  )}
                  {/* Ações aparecem no hover/foco; em toque, sempre */}
                  <div className="absolute inset-x-0 top-0 flex justify-end gap-0.5 p-1 opacity-0 transition-opacity group-focus-within/thumb:opacity-100 group-hover/thumb:opacity-100 [@media(hover:none)]:opacity-100">
                    <button
                      type="button"
                      onClick={() => remove(image.id)}
                      aria-label={`Remover imagem ${index + 1}`}
                      className="grid size-6 cursor-pointer place-items-center rounded-full bg-backdrop text-on-accent"
                    >
                      <X aria-hidden size={14} strokeWidth={2} />
                    </button>
                  </div>
                  {images.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 opacity-0 transition-opacity group-focus-within/thumb:opacity-100 group-hover/thumb:opacity-100 [@media(hover:none)]:opacity-100">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label={`Mover imagem ${index + 1} para a esquerda`}
                        className="grid size-6 cursor-pointer place-items-center rounded-full bg-backdrop text-on-accent disabled:invisible"
                      >
                        <ChevronLeft aria-hidden size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={`Mover imagem ${index + 1} para a direita`}
                        className="grid size-6 cursor-pointer place-items-center rounded-full bg-backdrop text-on-accent disabled:invisible"
                      >
                        <ChevronRight aria-hidden size={14} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {images.length > 1 && <p className="text-xs font-semibold text-slate-400">A imagem 1 é a capa do carrossel.</p>}
          {imageError && (
            <p role="alert" className="flex items-start gap-2 text-small text-danger">
              <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
              {imageError}
            </p>
          )}
        </section>

        {/* Legenda */}
        <section aria-labelledby="caption-title" className="flex flex-col gap-3">
          <label id="caption-title" htmlFor="post-caption" className="text-ui font-bold text-white">
            Legenda
          </label>
          <Textarea
            id="post-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={6}
            placeholder="Escreva a legenda do post… #hashtags funcionam aqui"
            className="min-h-36 text-ui"
            aria-invalid={caption.length > CAPTION_LIMIT || hashtags > HASHTAG_LIMIT}
          />
          <p className="flex justify-between text-xs font-semibold text-slate-400 tabular-nums">
            <span className={hashtags > HASHTAG_LIMIT ? 'text-danger' : undefined}>
              {hashtags}/{HASHTAG_LIMIT} hashtags
            </span>
            <span className={caption.length > CAPTION_LIMIT ? 'text-danger' : undefined}>
              {caption.length}/{CAPTION_LIMIT}
            </span>
          </p>
        </section>

        {/* Quando publicar */}
        <section aria-labelledby="when-title" className="flex flex-col gap-3">
          <h3 id="when-title" className="text-ui font-bold text-white">
            Quando publicar
          </h3>
          <div role="radiogroup" aria-labelledby="when-title" className="grid grid-cols-2 gap-1 rounded-md border bg-navy-750 p-1">
            {(
              [
                { value: 'schedule', label: 'Agendar' },
                { value: 'now', label: 'Publicar agora' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={`h-9 cursor-pointer rounded-sm text-ui transition-colors ${
                  mode === value ? 'bg-navy-800 font-bold text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'schedule' && (
            <Input
              type="datetime-local"
              value={scheduledAt}
              min={minDate}
              onChange={(event) => setScheduledAt(event.target.value)}
              aria-label="Data e hora da publicação"
              className="tabular-nums"
            />
          )}
        </section>
      </div>

      <footer className="flex flex-col gap-3 border-t px-5 py-4">
        <p className="text-small text-slate-400">{blocker}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {/* Publicação/agendamento de verdade: próxima etapa (depende do app da Meta) */}
          <Button disabled>{mode === 'now' ? 'Publicar agora' : 'Agendar'}</Button>
        </div>
      </footer>
    </>
  )
}
