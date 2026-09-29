import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface DropdownOption {
  value: string
  label: string
  /** Ícone ou marcador à esquerda do rótulo (ex.: bolinha da etapa, ícone da origem) */
  icon?: ReactNode
}

// Dropdown personalizado (padrão "listbox" de acessibilidade), no lugar do <select> nativo.
// Gatilho com a aparência do <Input>; lista flutuante igual ao Menu suspenso (BRAND.md, seção 8):
// fundo Navy 800, borda Navy 600, radius 12, sombra float. Setas/Home/End navegam, Enter ou Espaço
// escolhe, Esc fecha (só a lista, mesmo dentro de modal), uma letra pula para a opção. Posição fixa,
// para não ser cortada por rolagem. Controlado (`value`) ou não (`defaultValue`); com `name`, entra no
// FormData do formulário por um campo oculto.
export function Dropdown({
  id,
  name,
  label,
  value: controlledValue,
  defaultValue = '',
  options,
  onChange,
}: {
  /** Para ligar a um <label htmlFor> (ex.: dentro de <Field>) */
  id?: string
  /** Nome do campo no formulário */
  name?: string
  /** Nome acessível quando não há <label> visível (ex.: "Filtrar por etapa") */
  label?: string
  value?: string
  defaultValue?: string
  options: DropdownOption[]
  onChange?: (value: string) => void
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const value = controlledValue ?? uncontrolledValue
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const [active, setActive] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const open = position !== null
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const selected = options[selectedIndex]

  // A lista fica embaixo do gatilho, com pelo menos a largura dele, sem sair da tela
  function positionFromTrigger() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const width = Math.max(rect.width, 200)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    return { top: rect.bottom + 6, left, width }
  }

  function openList() {
    setActive(selectedIndex)
    setPosition(positionFromTrigger())
  }

  function close(returnFocus = true) {
    setPosition(null)
    if (returnFocus) triggerRef.current?.focus()
  }

  function choose(index: number) {
    const option = options[index]
    if (option) {
      setUncontrolledValue(option.value)
      onChange?.(option.value)
    }
    close()
  }

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!listRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false)
    }
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

  // Mantém a opção ativa visível quando a lista rola
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1
    if (event.key === 'Escape') {
      // Não deixa o Esc chegar ao <dialog> (fecharia o modal junto)
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      close(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.min(last, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1))))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : last)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(active)
    } else if (event.key.length === 1) {
      // Uma letra: próxima opção que começa com ela
      const letter = event.key.toLowerCase()
      const order = [...options.keys()].map((offset) => (active + 1 + offset) % options.length)
      const match = order.find((index) => options[index]?.label.toLowerCase().startsWith(letter))
      if (match !== undefined) setActive(match)
    }
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border bg-navy-800 px-3.5 text-left text-ui text-white transition-colors hover:border-navy-600 aria-expanded:border-navy-600"
      >
        {selected?.icon}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          aria-hidden
          size={16}
          strokeWidth={1.75}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {position && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-labelledby={label || !id ? undefined : id}
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={handleListKeyDown}
          style={{ top: position.top, left: position.left, width: position.width }}
          className="fixed z-40 flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-md border border-navy-600 bg-navy-800 p-1 shadow-float outline-none"
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(index)}
                onPointerMove={() => setActive(index)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xs px-2.5 py-2 text-ui ${
                  index === active ? 'bg-slate-tint text-white' : 'text-slate-300'
                }`}
              >
                {option.icon}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <Check aria-hidden size={16} strokeWidth={1.75} className="shrink-0 text-cyan" />}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
