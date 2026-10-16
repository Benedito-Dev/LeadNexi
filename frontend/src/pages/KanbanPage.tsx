import { CircleAlert, Plus, Search, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Dropdown } from '../components/ui/Dropdown.tsx'
import { Input } from '../components/ui/Input.tsx'
import { LeadFormDialog, type LeadFormTarget } from '../features/leads/components/LeadFormDialog.tsx'
import { useMoveLead } from '../features/leads/hooks.ts'
import { useLeadLists } from '../features/leads/hooks.ts'
import { KanbanBoard } from '../features/pipelines/components/KanbanBoard.tsx'
import { NewStageColumn } from '../features/stages/components/NewStageColumn.tsx'
import { PipelineKpis } from '../features/pipelines/components/PipelineKpis.tsx'
import { LostReasonDialog } from '../features/pipelines/components/LostReasonDialog.tsx'
import { usePipelineBoard, usePipelines } from '../features/pipelines/hooks.ts'
import { stageColorClass } from '../features/pipelines/stageColor.ts'
import type { PipelineBoard } from '../features/pipelines/types.ts'

export function KanbanPage() {
  const pipelines = usePipelines()
  const [searchParams, setSearchParams] = useSearchParams()

  // Funil escolhido fica na URL (?pipeline=id); sem escolha, o primeiro
  const list = pipelines.data ?? []
  const leadLists = useLeadLists()
  const pipelineId = list.find((p) => p.id === searchParams.get('pipeline'))?.id ?? list[0]?.id
  const listId = searchParams.get('lista') ?? ''
  const selectedList = leadLists.data?.find((item) => item.id === listId)
  const board = usePipelineBoard(pipelineId, {
    listId,
    includeArchived: selectedList?.archived ?? false,
  })

  const pipelineSelect = (
    <>
      {list.length > 1 && (
        <div className="w-44 shrink-0">
          <Dropdown
            label="Funil"
            value={pipelineId ?? ''}
            onChange={(value) => setSearchParams((current) => ({ ...Object.fromEntries(current), pipeline: value }))}
            options={list.map((pipeline) => ({ value: pipeline.id, label: pipeline.name }))}
          />
        </div>
      )}
      <div className="w-56 shrink-0">
        <Dropdown
          label="Lista ou nicho"
          value={listId}
          onChange={(value) => setSearchParams((current) => ({ ...Object.fromEntries(current), lista: value }))}
          options={[
            { value: '', label: 'Todas as listas ativas' },
            ...(leadLists.data ?? []).map((item) => ({
              value: item.id,
              label: `${item.name}${item.archived ? ' · arquivada' : ''}`,
            })),
          ]}
        />
      </div>
    </>
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

  return (
    <BoardView
      board={board.data}
      actions={pipelineSelect}
      listId={listId}
      includeArchived={selectedList?.archived ?? false}
    />
  )
}

function BoardView({
  board,
  actions,
  listId,
  includeArchived,
}: {
  board: PipelineBoard
  actions: ReactNode
  listId: string
  includeArchived: boolean
}) {
  const [formTarget, setFormTarget] = useState<LeadFormTarget | null>(null)
  const [lostMove, setLostMove] = useState<{ leadId: string; stageId: string; position: number; leadName: string } | null>(null)
  const [search, setSearch] = useState('')
  const move = useMoveLead(board.id, { listId, includeArchived })
  const firstStageId = board.stages[0]?.id

  function handleMoveLead(leadId: string, stageId: string, position: number) {
    const stage = board.stages.find((item) => item.id === stageId)
    const lead = board.stages.flatMap((item) => item.leads).find((item) => item.id === leadId)
    if (stage?.stageType === 'LOST' && lead?.stageId !== stageId) {
      setLostMove({ leadId, stageId, position, leadName: lead?.name ?? 'este lead' })
      return
    }
    move.move(leadId, stageId, position)
  }

  return (
    <Page
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
        <div className="flex max-w-sm flex-col gap-4">
          <p className="text-body text-slate-400">Este funil ainda não tem etapas. Crie a primeira coluna.</p>
          <NewStageColumn pipelineId={board.id} />
        </div>
      ) : (
        <KanbanBoard
          board={board}
          search={search}
          onMoveLead={handleMoveLead}
          onAddLead={(stageId) => setFormTarget({ mode: 'create', stageId })}
          onOpenLead={(lead) => setFormTarget({ mode: 'edit', lead })}
        />
      )}

      <LeadFormDialog
        target={formTarget}
        stages={board.stages.map((stage, index) => ({
          id: stage.id,
          label: stage.name,
          colorClass: stageColorClass(index),
        }))}
        onClose={() => setFormTarget(null)}
      />

      <LostReasonDialog
        open={lostMove !== null}
        leadName={lostMove?.leadName ?? ''}
        onClose={() => setLostMove(null)}
        onConfirm={(reason) => {
          if (!lostMove) return
          move.move(lostMove.leadId, lostMove.stageId, lostMove.position, reason)
          setLostMove(null)
        }}
      />
    </Page>
  )
}

function Page({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Funil de vendas" actions={actions} />
      {children}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando funil" className="flex flex-col gap-6">
      <div className="h-13 w-2/3 animate-pulse rounded-md bg-navy-800" />
      <div className="grid auto-cols-[minmax(248px,1fr)] grid-flow-col gap-5 overflow-hidden">
        {[0, 1, 2, 3].map((column) => (
          <div key={column} className="h-40 animate-pulse rounded-md bg-navy-800" />
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
