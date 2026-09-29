import type { PipelineBoard } from './types.ts'

/**
 * Aplica no quadro local a mesma regra do backend (PATCH /leads/:id/move):
 * tira o card da coluna de origem e o insere na posição de destino,
 * mantendo as posições contíguas nas duas colunas.
 */
export function applyLeadMove(
  board: PipelineBoard,
  leadId: string,
  toStageId: string,
  toIndex: number,
): PipelineBoard {
  const lead = board.stages.flatMap((stage) => stage.leads).find((l) => l.id === leadId)
  if (!lead) return board

  const moved = { ...lead, stageId: toStageId, updatedAt: new Date().toISOString() }
  return {
    ...board,
    stages: board.stages.map((stage) => {
      let leads = stage.leads.filter((l) => l.id !== leadId)
      if (stage.id === toStageId) {
        const index = Math.max(0, Math.min(toIndex, leads.length))
        leads = [...leads.slice(0, index), moved, ...leads.slice(index)]
      }
      if (leads.length === stage.leads.length && stage.id !== toStageId) return stage
      return { ...stage, leads: leads.map((l, position) => ({ ...l, position })) }
    }),
  }
}

export interface PipelineKpis {
  totalLeads: number
  /** Leads fora da etapa final */
  openCount: number
  /** Soma dos valores fora da etapa final */
  openValue: number
  /** Leads na etapa final */
  closedCount: number
  /** Soma dos valores na etapa final */
  closedValue: number
  /** Leads na etapa final ÷ total (0 a 1); null sem leads */
  conversionRate: number | null
}

const leadValue = (lead: { estimatedValue: string | null }) => Number(lead.estimatedValue ?? 0)

/** Indicadores do topo do funil. A última etapa é tratada como "fechado". */
export function computeKpis(board: PipelineBoard): PipelineKpis {
  const lastStageId = board.stages.at(-1)?.id
  const leads = board.stages.flatMap((stage) => stage.leads)
  const closed = leads.filter((lead) => lead.stageId === lastStageId)
  const open = leads.filter((lead) => lead.stageId !== lastStageId)
  const sum = (list: typeof leads) => list.reduce((total, lead) => total + leadValue(lead), 0)

  return {
    totalLeads: leads.length,
    openCount: open.length,
    openValue: sum(open),
    closedCount: closed.length,
    closedValue: sum(closed),
    conversionRate: leads.length > 0 ? closed.length / leads.length : null,
  }
}

/** Valor em aberto por etapa (todas menos a final), na ordem do funil. */
export function openValueByStage(board: PipelineBoard): { id: string; name: string; value: number }[] {
  return board.stages.slice(0, -1).map((stage) => ({
    id: stage.id,
    name: stage.name,
    value: stage.leads.reduce((total, lead) => total + leadValue(lead), 0),
  }))
}

/** Leads criados por dia (data local), dos últimos `days` dias até hoje. */
export function newLeadsPerDay(board: PipelineBoard, days: number, now = new Date()): { label: string; count: number }[] {
  const dayKey = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const counts = new Map<string, number>()
  for (const lead of board.stages.flatMap((stage) => stage.leads)) {
    const key = dayKey(new Date(lead.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (days - 1 - index))
    const label = dayKey(date)
    return { label, count: counts.get(label) ?? 0 }
  })
}
