import type { PipelineBoard } from './types.ts'

/** Applies a lead move locally while the server confirms it. */
export function applyLeadMove(
  board: PipelineBoard,
  leadId: string,
  toStageId: string,
  toIndex: number,
): PipelineBoard {
  const lead = board.stages.flatMap((stage) => stage.leads).find((item) => item.id === leadId)
  if (!lead) return board

  const moved = { ...lead, stageId: toStageId, updatedAt: new Date().toISOString() }
  return {
    ...board,
    stages: board.stages.map((stage) => {
      let leads = stage.leads.filter((item) => item.id !== leadId)
      if (stage.id === toStageId) {
        const index = Math.max(0, Math.min(toIndex, leads.length))
        leads = [...leads.slice(0, index), moved, ...leads.slice(index)]
      }
      if (leads.length === stage.leads.length && stage.id !== toStageId) return stage
      return { ...stage, leads: leads.map((item, position) => ({ ...item, position })) }
    }),
  }
}
