import { useEffect, useRef, type ReactNode } from 'react'

// Painel lateral da marca: <dialog> nativo (foco preso, Esc fecha) encostado à direita, altura total.
// Fundo Navy 800, borda esquerda Navy 600, sombra float. O conteúdo só é montado enquanto aberto.
// Sem cabeçalho próprio: quem usa monta o topo (título, ações, fechar).
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  /** Nome acessível do painel */
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
      className="my-0 mr-0 ml-auto h-dvh max-h-none w-[min(480px,100vw)] max-w-none border-l border-navy-600 bg-navy-800 p-0 text-white shadow-float backdrop:bg-backdrop"
    >
      {open && <div className="flex h-full flex-col">{children}</div>}
    </dialog>
  )
}
