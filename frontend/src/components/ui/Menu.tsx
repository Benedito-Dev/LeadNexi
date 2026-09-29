import type { LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
  disabled?: boolean
  /** Explicação curta abaixo do rótulo (ex.: por que está desativado) */
  hint?: string
  danger?: boolean
}

const MENU_WIDTH = 224

// Menu suspenso (padrão "menu button" de acessibilidade): setas navegam, Esc fecha e devolve o
// foco ao botão. Posição fixa calculada pelo botão, para não ser cortado por áreas com rolagem.
// Flutuante: fundo Navy 800, borda Navy 600 e sombra float (BRAND.md, regra 10).
export function Menu({ label, trigger, items }: { label: string; trigger: ReactNode; items: MenuItem[] }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const open = position !== null

  // Alinha a borda direita do menu com a do botão, sem sair da tela
  function positionFromTrigger() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    return { top: rect.bottom + 6, left }
  }

  function openMenu() {
    setPosition(positionFromTrigger())
  }

  function close(returnFocus = true) {
    setPosition(null)
    if (returnFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not(:disabled)')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false)
    }
    // Posição fixa: se a página ou o quadro rolar (inclusive para mostrar o botão focado),
    // o menu acompanha o botão
    const onScroll = () => setPosition(positionFromTrigger())
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)') ?? [])]
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      close(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      enabled[(index + step + enabled.length) % enabled.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      enabled[event.key === 'Home' ? 0 : enabled.length - 1]?.focus()
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu())}
        className="grid size-7 cursor-pointer place-items-center rounded-xs text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300 aria-expanded:bg-navy-800 aria-expanded:text-slate-300"
      >
        {trigger}
      </button>

      {position && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleKeyDown}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-40 flex flex-col gap-0.5 rounded-md border border-navy-600 bg-navy-800 p-1 shadow-float"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, disabled, hint, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                close()
                onSelect()
              }}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xs px-2.5 py-2 text-left transition-colors hover:bg-navy-750 focus-visible:bg-navy-750 focus-visible:outline-none disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                disabled ? 'text-slate-400' : danger ? 'text-danger' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon aria-hidden size={18} strokeWidth={1.75} className="mt-px shrink-0" />
              <span className="flex flex-col">
                <span className="text-ui">{itemLabel}</span>
                {hint && <span className="text-xs font-medium text-slate-400">{hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
