import { memo, useEffect, useRef, useState } from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { COR_PADRAO_ETAPA, ROTULO_TIPO_ETAPA } from '../etapas'
import type { Etapa } from '../types'

type EtapaArrastavelProps = {
  etapa: Etapa
  onEditar: (etapa: Etapa) => void
  onExcluir: (etapa: Etapa) => void
  /** A ordem está sendo gravada: o arrasto fica travado para não mandar duas ordens seguidas. */
  salvando: boolean
}

/** Linha da lista de etapas, arrastável pela alça à esquerda. */
export const EtapaArrastavel = memo(function EtapaArrastavel({ etapa, onEditar, onExcluir, salvando }: EtapaArrastavelProps) {
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
      className={cn('relative flex items-center gap-3 px-4 py-3 bg-card transition-opacity', arrastando && 'opacity-40')}
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

      <span
        className="h-4 w-4 rounded-full shrink-0 border border-border"
        style={{ backgroundColor: etapa.color || COR_PADRAO_ETAPA }}
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-foreground truncate">{etapa.name}</span>
      {/* No lugar do selo "Inativa" do Rizar: o tipo, que no LeadNexi muda o que a etapa faz */}
      {etapa.stageType !== 'CUSTOM' && (
        <Badge variant="secondary" className="shrink-0">
          {ROTULO_TIPO_ETAPA[etapa.stageType]}
        </Badge>
      )}

      <div className="ml-auto flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => onEditar(etapa)} title="Editar etapa">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={() => onExcluir(etapa)}
          title="Excluir etapa"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
})
