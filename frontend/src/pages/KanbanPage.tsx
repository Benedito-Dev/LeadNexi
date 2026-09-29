import { CircleAlert, Plus, Search, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Select } from '../components/ui/Field.tsx'
import { Input } from '../components/ui/Input.tsx'
import { LeadFormDialog, type LeadFormTarget } from '../features/leads/components/LeadFormDialog.tsx'
import { useMoveLead } from '../features/leads/hooks.ts'
import { KanbanBoard } from '../features/pipelines/components/KanbanBoard.tsx'
import { PipelineKpis } from '../features/pipelines/components/PipelineKpis.tsx'
import { usePipelineBoard, usePipelines } from '../features/pipelines/hooks.ts'
import type { PipelineBoard } from '../features/pipelines/types.ts'

export function KanbanPage() {
  const pipelines = usePipelines()
  const [searchParams, setSearchParams] = useSearchParams()

  // Funil escolhido fica na URL (?pipeline=id); sem escolha, o primeiro
  const list = pipelines.data ?? []
  const pipelineId = list.find((p) => p.id === searchParams.get('pipeline'))?.id ?? list[0]?.id
  const board = usePipelineBoard(pipelineId)

  const pipelineSelect = list.length > 1 && (
    <Select
      aria-label="Funil"
      value={pipelineId}
      onChange={(event) => setSearchParams({ pipeline: event.target.value })}
      className="w-auto min-w-44"
    >
      {list.map((pipeline) => (
        <option key={pipeline.id} value={pipeline.id}>
          {pipeline.name}
        </option>
      ))}
    </Select>
  )

  if (pipelines.isError || board.isError) {
    return (
      <Page>
        <ErrorState onRetry={() => void (pipelines.isError ? pipelines.refetch() : board.refetch())} />
      </Page>
    )
  }
  if (pipelines.isPending || (pipelineId && board.isPending)) {
    return (
      <Page>
        <BoardSkeleton />
      </Page>
    )
  }
  if (!pipelineId || !board.data) {
    return (
      <Page>
        <p className="text-body text-slate-400">Nenhum funil criado ainda.</p>
      </Page>
    )
  }

  return <BoardView board={board.data} actions={pipelineSelect} />
}

function BoardView({ board, actions }: { board: PipelineBoard; actions: ReactNode }) {
  const [formTarget, setFormTarget] = useState<LeadFormTarget | null>(null)
  const [search, setSearch] = useState('')
  const move = useMoveLead(board.id)
  const firstStageId = board.stages[0]?.id

  return (
    <Page
      badge={
        <span className="rounded-full bg-slate-tint px-2.5 py-1 text-xs leading-none font-bold text-slate-300">
          {board.name}
        </span>
      }
      actions={
        <>
          {actions}
          <div className="min-w-0 flex-1 sm:w-60 sm:flex-none">
            <Input
              type="search"
              icon={Search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar lead"
              aria-label="Buscar lead no funil"
            />
          </div>
          {firstStageId && (
            <Button onClick={() => setFormTarget({ mode: 'create', stageId: firstStageId })}>
              <Plus aria-hidden size={18} strokeWidth={1.75} />
              Novo lead
            </Button>
          )}
        </>
      }
    >
      <PipelineKpis board={board} />

      {move.error && (
        <div role="alert" className="flex items-center gap-3 rounded-md border border-danger/40 bg-navy-800 px-4 py-3 text-small text-danger">
          <CircleAlert aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
          <p className="flex-1">Não foi possível mover o lead. O quadro voltou ao estado salvo.</p>
          <button
            type="button"
            onClick={move.reset}
            aria-label="Dispensar aviso"
            className="grid size-8 cursor-pointer place-items-center rounded-sm text-slate-400 hover:bg-navy-750 hover:text-slate-300"
          >
            <X aria-hidden size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {board.stages.length === 0 ? (
        <p className="text-body text-slate-400">Este funil ainda não tem etapas.</p>
      ) : (
        <KanbanBoard
          board={board}
          search={search}
          onMoveLead={move.move}
          onAddLead={(stageId) => setFormTarget({ mode: 'create', stageId })}
          onOpenLead={(lead) => setFormTarget({ mode: 'edit', lead })}
        />
      )}

      <LeadFormDialog
        target={formTarget}
        pipelineId={board.id}
        stages={board.stages}
        onClose={() => setFormTarget(null)}
      />
    </Page>
  )
}

function Page({
  badge,
  actions,
  children,
}: {
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Funil de vendas" badge={badge} actions={actions} />
      {children}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando funil" className="flex flex-col gap-5">
      <div className="h-19 animate-pulse rounded-lg border bg-navy-750" />
      <div className="grid auto-cols-[minmax(256px,1fr)] grid-flow-col gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((column) => (
          <div key={column} className="h-80 animate-pulse rounded-lg border border-kanban-border bg-navy-850" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-body text-slate-400">Não foi possível carregar o funil.</p>
      <Button variant="secondary" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  )
}
