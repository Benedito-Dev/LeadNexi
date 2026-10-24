import { useEffect, useRef } from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { Kanban, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DadosDaColuna, Etapa, Lead } from '../types'
import { KanbanColumn } from './KanbanColumn'

type KanbanBoardProps = {
  columns: Etapa[]
  columnsData: Record<string, DadosDaColuna>
  onLoadMore: (columnId: string) => void
  onCardClick: (lead: Lead) => void
  onMoveCard: (cardId: string, sourceColumnId: string, destColumnId: string) => void
  onAddProspect: (columnId: string) => void
  origensFiltradas: string[]
  onFiltrarOrigem: (origem: string) => void
  onRenomearEtapa: (columnId: string, nome: string) => void
  onTrocarCorEtapa: (columnId: string, cor: string, adiar?: boolean) => void
  isLoading: boolean
  temPipelines: boolean
  pipelineSelecionado: boolean
  onConfigurarPipelines: () => void
}

/** Progressão do funil (BRAND.md, seção 8): violeta → azul → ciano; da 4ª etapa em diante, ciano. */
const CORES_DO_FUNIL = ['#6D5DFB', '#5C8AF6', '#3DB3F1', '#22D3EE']

/** Colunas lado a lado com rolagem horizontal; um monitor central recebe todos os soltar. */
export function KanbanBoard({
  columns,
  columnsData,
  onLoadMore,
  onCardClick,
  onMoveCard,
  onAddProspect,
  origensFiltradas,
  onFiltrarOrigem,
  onRenomearEtapa,
  onTrocarCorEtapa,
  isLoading,
  temPipelines,
  pipelineSelecionado,
  onConfigurarPipelines,
}: KanbanBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => source.data.type === 'card',
        onDrop: ({ source, location }) => {
          const destino = location.current.dropTargets[0]
          if (!destino) return
          const cardId = source.data.cardId as string
          const sourceColumnId = source.data.sourceColumnId as string
          const destColumnId = destino.data.columnId as string | undefined
          if (!destColumnId || sourceColumnId === destColumnId) return
          onMoveCard(cardId, sourceColumnId, destColumnId)
        },
      }),
    [onMoveCard],
  )

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    return autoScrollForElements({ element: el, canScroll: ({ source }) => source.data.type === 'card' })
  }, [])

  if (columns.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Kanban className="h-8 w-8 opacity-25" />
        </div>
        <h3 className="text-base font-semibold text-foreground/60 mb-1">
          {!temPipelines
            ? 'Nenhum pipeline criado'
            : pipelineSelecionado
              ? 'Este pipeline não tem etapas'
              : 'Nenhum pipeline selecionado'}
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-xs text-center">
          {!temPipelines
            ? 'Crie seu primeiro pipeline com as etapas do seu funil — elas viram as colunas deste quadro.'
            : pipelineSelecionado
              ? 'Cadastre as etapas do funil para elas virarem as colunas deste quadro.'
              : 'Selecione um pipeline no filtro acima para visualizar as etapas e leads do CRM.'}
        </p>
        <Button variant="outline" className="mt-4" onClick={onConfigurarPipelines}>
          <Settings2 className="h-4 w-4 mr-1" />
          {!temPipelines ? 'Criar pipeline' : pipelineSelecionado ? 'Cadastrar etapas' : 'Configurar pipelines'}
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div ref={boardRef} className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none min-h-[60vh]">
      {columns.map((col, i) => (
        <KanbanColumn
          key={col.id}
          column={col}
          cor={col.color || CORES_DO_FUNIL[Math.min(i, CORES_DO_FUNIL.length - 1)]}
          columnData={columnsData[col.id]}
          onLoadMore={onLoadMore}
          onCardClick={onCardClick}
          onAddProspect={onAddProspect}
          origensFiltradas={origensFiltradas}
          onFiltrarOrigem={onFiltrarOrigem}
          onRenomearEtapa={onRenomearEtapa}
          onTrocarCorEtapa={onTrocarCorEtapa}
          isLoading={isLoading}
        />
      ))}
    </div>
    </TooltipProvider>
  )
}
