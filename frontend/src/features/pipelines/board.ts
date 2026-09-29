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
  /** Soma dos valores fora da etapa final */
  openValue: number
  /** Soma dos valores na etapa final */
  closedValue: number
  /** Leads na etapa final ÷ total (0 a 1); null sem leads */
  conversionRate: number | null
}

/** Indicadores do topo do funil. A última etapa é tratada como "fechado". */
export function computeKpis(board: PipelineBoard): PipelineKpis {
  const lastStageId = board.stages.at(-1)?.id
  const leads = board.stages.flatMap((stage) => stage.leads)
  const closed = leads.filter((lead) => lead.stageId === lastStageId)
  const sum = (list: typeof leads) => list.reduce((total, lead) => total + Number(lead.estimatedValue ?? 0), 0)

  return {
    totalLeads: leads.length,
    openValue: sum(leads.filter((lead) => lead.stageId !== lastStageId)),
    closedValue: sum(closed),
    conversionRate: leads.length > 0 ? closed.length / leads.length : null,
  }
}
