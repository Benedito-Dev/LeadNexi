import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

// Modal da marca: <dialog> nativo (foco preso, Esc fecha), painel flutuante com sombra float.
// O conteúdo só é montado enquanto aberto, então formulários começam sempre limpos.
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      // Clique no fundo escurecido fecha
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(520px,calc(100vw-32px))] rounded-xl border border-navy-600 bg-navy-800 p-0 text-white shadow-float backdrop:bg-backdrop"
    >
      {open && (
        <>
          <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
            <h2 className="text-h2">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid size-9 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
            >
              <X aria-hidden size={20} strokeWidth={1.75} />
            </button>
          </header>
          <div className="px-6 py-5">{children}</div>
        </>
      )}
    </dialog>
  )
}
