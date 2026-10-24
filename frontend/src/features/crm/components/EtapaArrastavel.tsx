import { memo, useEffect, useRef, useState } from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ICONE_DA_ETAPA, ROTULO_TIPO_ETAPA } from '../etapas'
import type { Etapa } from '../types'

type EtapaArrastavelProps = {
  etapa: Etapa
  onEditar: (etapa: Etapa) => void
  onExcluir: (etapa: Etapa) => void
  /** A ordem está sendo gravada: o arrasto fica travado para não mandar duas ordens seguidas. */
  salvando: boolean
  /** Cor da etapa (a cadastrada, ou a da progressão do funil pela posição). */
  cor: string
}

const botaoDaLinha =
  'grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leadnexi-cyan/60'

/** Linha da lista de etapas, arrastável pela alça à esquerda. */
export const EtapaArrastavel = memo(function EtapaArrastavel({ etapa, onEditar, onExcluir, salvando, cor }: EtapaArrastavelProps) {
  const Icone = ICONE_DA_ETAPA[etapa.stageType]
  const mostrarTipo =
    etapa.stageType !== 'CUSTOM' &&
    etapa.name.trim().toLowerCase() !== ROTULO_TIPO_ETAPA[etapa.stageType].toLowerCase()
  const linhaRef = useRef<HTMLLIElement>(null)
  const alcaRef = useRef<HTMLButtonElement>(null)
  const [arrastando, setArrastando] = useState(false)
  const [borda, setBorda] = useState<Edge | null>(null)

  useEffect(() => {
    const linha = linhaRef.current
    const alca = alcaRef.current
    if (!linha || !alca || salvando) return
    return draggable({
      element: linha,
      dragHandle: alca,
      getInitialData: () => ({ type: 'etapa', etapaId: etapa.id }),
      onDragStart: () => setArrastando(true),
      onDrop: () => setArrastando(false),
    })
  }, [etapa.id, salvando])

  useEffect(() => {
    const linha = linhaRef.current
    if (!linha || salvando) return
    return dropTargetForElements({
      element: linha,
      getData: ({ input, element }) =>
        attachClosestEdge({ type: 'etapa', etapaId: etapa.id }, { input, element, allowedEdges: ['top', 'bottom'] }),
      canDrop: ({ source }) => source.data.type === 'etapa' && source.data.etapaId !== etapa.id,
      onDragEnter: ({ self }) => setBorda(extractClosestEdge(self.data)),
      onDrag: ({ self }) => setBorda(extractClosestEdge(self.data)),
      onDragLeave: () => setBorda(null),
      onDrop: () => setBorda(null),
    })
  }, [etapa.id, salvando])

  return (
    <li
      ref={linhaRef}
      className={cn('group relative flex items-center gap-3 px-4 py-3 bg-card transition-opacity font-marca', arrastando && 'opacity-40')}
    >
      {borda && (
        <span
          className={cn('absolute left-0 right-0 h-0.5 bg-primary', borda === 'top' ? 'top-0' : 'bottom-0')}
          aria-hidden="true"
        />
      )}

      <button
        ref={alcaRef}
        type="button"
        className={cn(
          'shrink-0 rounded p-0.5 text-muted-foreground',
          'hover:text-foreground focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring',
          salvando ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing',
        )}
        aria-label={`Arrastar ${etapa.name} para reordenar`}
        disabled={salvando}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Ícone do tipo na cor da etapa, como na ficha do lead */}
      <Icone className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} style={{ color: cor }} aria-hidden />
      <span className="truncate text-sm font-semibold text-foreground">{etapa.name}</span>
      {/* O tipo só aparece quando o nome não diz (ex.: "Call agendada", do tipo Reunião marcada) */}
      {mostrarTipo && <span className="shrink-0 text-xs font-medium text-muted-foreground">{ROTULO_TIPO_ETAPA[etapa.stageType]}</span>}

      {/* Ações discretas: aparecem ao passar o mouse na linha (no toque, sempre) */}
      <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <button type="button" onClick={() => onEditar(etapa)} className={botaoDaLinha} aria-label={`Editar ${etapa.name}`} title="Editar etapa">
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onExcluir(etapa)}
          className={cn(botaoDaLinha, 'hover:bg-destructive/10 hover:text-destructive')}
          aria-label={`Excluir ${etapa.name}`}
          title="Excluir etapa"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
})
