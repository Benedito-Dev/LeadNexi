import { memo, useState } from 'react'
import { Check, MoreHorizontal, Palette, Pencil, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { CORES_DE_ETAPA } from '../etapas'

type KanbanColumnHeaderProps = {
  title: string
  count: number
  /** Cor da etapa: pinta o cabeçalho (fundo em tom claro, linha e contador na cor cheia). */
  cor: string
  onAddProspect: () => void
  onRenomear: (nome: string) => void
  /** `adiar`: a cor ainda está mudando (seletor livre); grava só quando parar. */
  onTrocarCor: (cor: string, adiar?: boolean) => void
}

/** Título da etapa, contador e menu de ações da coluna, no tom da cor da etapa. */
export const KanbanColumnHeader = memo(function KanbanColumnHeader({
  title,
  count,
  cor,
  onAddProspect,
  onRenomear,
  onTrocarCor,
}: KanbanColumnHeaderProps) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(title)

  const comecarRenomear = () => {
    setRascunho(title)
    setEditando(true)
  }

  const salvarNome = () => {
    const nome = rascunho.trim()
    setEditando(false)
    if (nome && nome !== title) onRenomear(nome)
  }

  return (
    <div className="relative">
      <div
        className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5 rounded-t-xl"
        style={{ backgroundColor: `color-mix(in srgb, ${cor} 18%, transparent)` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editando ? (
            <input
              autoFocus
              value={rascunho}
              maxLength={60}
              aria-label="Nome da etapa"
              onChange={(e) => setRascunho(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={salvarNome}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  setRascunho(title)
                  setEditando(false)
                }
              }}
              className="!min-h-0 h-7 w-full min-w-0 rounded-md border border-input bg-card px-2 text-sm font-semibold text-foreground"
            />
          ) : (
            <h3 className="truncate text-sm font-semibold text-foreground" onDoubleClick={comecarRenomear}>
              {title}
            </h3>
          )}
          <span
            className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-foreground text-xs font-semibold tabular-nums shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${cor} 35%, transparent)` }}
          >
            {count}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`Ações da coluna ${title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onAddProspect}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar lead
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Espera o menu fechar antes de abrir o campo: senão o menu devolve o foco ao botão e o campo fecha */}
            <DropdownMenuItem onSelect={() => setTimeout(comecarRenomear, 0)}>
              <Pencil className="h-4 w-4 mr-2" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="h-4 w-4 mr-2" /> Trocar cor
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {CORES_DE_ETAPA.map((opcao) => {
                    const escolhida = opcao.cor.toLowerCase() === cor.toLowerCase()
                    return (
                      <DropdownMenuItem
                        key={opcao.cor}
                        onSelect={() => onTrocarCor(opcao.cor)}
                        aria-label={opcao.nome}
                        title={opcao.nome}
                        className="h-8 w-8 justify-center p-0 focus:bg-transparent"
                      >
                        <span
                          className={cn(
                            'grid h-6 w-6 place-items-center rounded-full ring-offset-2 ring-offset-popover',
                            escolhida && 'ring-2 ring-foreground',
                          )}
                          style={{ backgroundColor: opcao.cor }}
                        >
                          {escolhida && <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                </div>
                <DropdownMenuSeparator className="my-2" />
                <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-accent">
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => onTrocarCor(e.target.value, true)}
                    className="!min-h-0 h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                  />
                  Outra cor
                </label>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="h-[2px]" style={{ backgroundColor: cor }} />
    </div>
  )
})
