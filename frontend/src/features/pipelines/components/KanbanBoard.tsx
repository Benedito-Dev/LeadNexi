import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useLayoutEffect, useRef, useState } from 'react'
import { whatsappUrl } from '../../../lib/format.ts'
import type { Lead } from '../../leads/types.ts'
import { NewStageColumn } from '../../stages/components/NewStageColumn.tsx'
import type { PipelineBoard } from '../types.ts'
import { KanbanColumn } from './KanbanColumn.tsx'
import { LeadCard } from './LeadCard.tsx'

/** Ids dos leads por etapa, na ordem exibida. */
type Columns = Record<string, string[]>

function toColumns(board: PipelineBoard): Columns {
  return Object.fromEntries(board.stages.map((stage) => [stage.id, stage.leads.map((lead) => lead.id)]))
}

function findStage(columns: Columns, id: UniqueIdentifier): string | undefined {
  const key = String(id)
  if (key in columns) return key
  return Object.keys(columns).find((stageId) => columns[stageId]?.includes(key))
}

/** Busca sem diferenciar maiúsculas nem acentos, em nome, contato e origem. */
function matchesSearch(lead: Lead, search: string): boolean {
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const haystack = normalize([lead.name, lead.phone, lead.email, lead.source].filter(Boolean).join(' '))
  return haystack.includes(normalize(search))
}

export function KanbanBoard({
  board,
  search = '',
  onMoveLead,
  onAddLead,
  onOpenLead,
}: {
  board: PipelineBoard
  /** Com busca ativa o quadro só filtra: arrastar fica desligado (as posições não batem) */
  search?: string
  onMoveLead: (leadId: string, stageId: string, position: number) => void
  onAddLead: (stageId: string) => void
  onOpenLead: (lead: Lead) => void
}) {
  // Durante o arraste, a ordem vive aqui; fora dele, vem direto do servidor (cache).
  const [dragColumns, setDragColumns] = useState<Columns | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const columns = dragColumns ?? toColumns(board)
  // O sensor de teclado guarda o getter do início do arraste: ele lê a ordem atual por aqui
  const columnsRef = useRef(columns)
  useLayoutEffect(() => {
    columnsRef.current = columns
  })

  const leadsById = new Map(board.stages.flatMap((stage) => stage.leads).map((lead) => [lead.id, lead]))
  const stageName = (id: string | undefined) => board.stages.find((stage) => stage.id === id)?.name ?? ''
  const lastStageId = board.stages.at(-1)?.id

  // ← → pulam para a coluna vizinha pela ordem das etapas. O getter padrão escolhe a
  // coluna pela geometria, e a rotação do card arrastado o faz "achar" a própria coluna.
  // ↑ ↓ seguem o comportamento padrão (reordenar dentro da coluna).
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') {
      return sortableKeyboardCoordinates(event, args)
    }
    event.preventDefault()
    const { active, droppableRects } = args.context
    const stageIds = board.stages.map((stage) => stage.id)
    const current = active ? findStage(columnsRef.current, active.id) : undefined
    const next = stageIds[stageIds.indexOf(current ?? '') + (event.code === 'ArrowRight' ? 1 : -1)]
    const rect = next ? droppableRects.get(next) : undefined
    return rect ? { x: rect.left, y: rect.top } : undefined
  }

  const sensors = useSensors(
    // Distância mínima: um clique simples continua abrindo o card
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // No toque, segurar para arrastar; deslizar rola a tela
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setDragColumns(toColumns(board))
  }

  // Passou para outra coluna: move o card na hora, para a coluna abrir espaço
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    setDragColumns((current) => {
      if (!current) return current
      const from = findStage(current, active.id)
      const to = findStage(current, over.id)
      if (!from || !to || from === to) return current

      const target = current[to] ?? []
      const overIndex = target.indexOf(String(over.id))
      const translated = active.rect.current.translated
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2
      const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length

      return {
        ...current,
        [from]: (current[from] ?? []).filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
      }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const leadId = String(active.id)
    const final = dragColumns
    setActiveId(null)
    setDragColumns(null)
    if (!final || !over) return

    const stageId = findStage(final, leadId)
    if (!stageId) return
    let ids = final[stageId] ?? []
    // Reordenação dentro da mesma coluna
    const overIndex = ids.indexOf(String(over.id))
    if (overIndex >= 0) ids = arrayMove(ids, ids.indexOf(leadId), overIndex)
    const position = ids.indexOf(leadId)

    const original = leadsById.get(leadId)
    if (original && original.stageId === stageId && original.position === position) return
    onMoveLead(leadId, stageId, position)
  }

  function handleDragCancel() {
    setActiveId(null)
    setDragColumns(null)
  }

  // Leitores de tela: anúncios em português
  const leadName = (id: UniqueIdentifier) => leadsById.get(String(id))?.name ?? 'Lead'
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${leadName(active.id)} selecionado.`,
    onDragOver: ({ active, over }) =>
      over ? `${leadName(active.id)} sobre ${stageName(findStage(columns, over.id))}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${leadName(active.id)} movido para ${stageName(findStage(columns, over.id))}.`
        : `${leadName(active.id)} solto fora do quadro.`,
    onDragCancel: ({ active }) => `Movimento de ${leadName(active.id)} cancelado.`,
  }

  const activeLead = activeId ? leadsById.get(activeId) : undefined
  const query = search.trim()
  const visible = (lead: Lead) => !query || matchesSearch(lead, query)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Pressione Espaço para pegar o card. Use as setas para mover, Espaço para soltar e Esc para cancelar.',
        },
      }}
    >
      <div className="flex items-stretch gap-4 overflow-x-auto pb-2">
        {board.stages.map((stage, index) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            index={index}
            stageCount={board.stages.length}
            stageLeadCount={stage.leads.length}
            leads={(columns[stage.id] ?? []).flatMap((id) => leadsById.get(id) ?? []).filter(visible)}
            closed={stage.id === lastStageId}
            dragDisabled={query !== ''}
            onAddLead={onAddLead}
            onOpenLead={onOpenLead}
          />
        ))}
        <NewStageColumn pipelineId={board.id} />
      </div>

      <DragOverlay>
        {activeLead && (
          <LeadCard
            lead={activeLead}
            closed={findStage(columns, activeLead.id) === lastStageId}
            dragging
            actionSpace={activeLead.phone !== null && whatsappUrl(activeLead.phone) !== null}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
