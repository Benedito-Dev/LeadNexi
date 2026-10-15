import { useEffect, useRef, type ReactNode } from 'react'

// Modal grande da marca: <dialog> nativo (foco preso, Esc fecha) centralizado, até 1040 × 760 px,
// fundo Navy 800, borda Navy 600, raio 20 e sombra float; no celular ocupa a tela inteira.
// Sem cabeçalho próprio (quem usa monta o topo). O conteúdo só é montado enquanto aberto.
export function Modal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  /** Nome acessível do modal */
  label: string
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
      aria-label={label}
      onClose={onClose}
      // Clique no fundo escurecido fecha
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto h-[min(760px,calc(100dvh-32px))] max-h-none w-[min(1040px,calc(100vw-32px))] max-w-none flex-col rounded-xl border border-navy-600 bg-navy-800 p-0 text-white shadow-float backdrop:bg-backdrop open:flex max-sm:h-dvh max-sm:w-screen max-sm:rounded-none max-sm:border-0"
    >
      {open && children}
    </dialog>
  )
}
