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

export interface PipelineKpis {
  totalLeads: number
  activeCount: number
  openCount: number
  openValue: number
  closedCount: number
  closedValue: number
  closedMonthCount: number
  closedMonthValue: number
  contactedCount: number
  respondedCount: number
  responseRate: number | null
  conversionRate: number | null
}

const leadValue = (lead: { estimatedValue: string | null }) => Number(lead.estimatedValue ?? 0)

/** Calculates funnel indicators from each stage's semantic type. */
export function computeKpis(board: PipelineBoard, now = new Date()): PipelineKpis {
  const leads = board.stages.flatMap((stage) => stage.leads)
  const stageById = new Map(board.stages.map((stage) => [stage.id, stage]))
  const typeOf = (lead: (typeof leads)[number]) => stageById.get(lead.stageId)?.stageType ?? 'CUSTOM'
  const closed = leads.filter((lead) => typeOf(lead) === 'WON')
  const lost = leads.filter((lead) => typeOf(lead) === 'LOST')
  const open = leads.filter((lead) => !closed.includes(lead) && !lost.includes(lead))
  const contacted = leads.filter((lead) => !['CONTACT', 'CUSTOM'].includes(typeOf(lead)))
  const responded = leads.filter((lead) => ['RESPONDED', 'MEETING', 'PROPOSAL', 'WON'].includes(typeOf(lead)))
  const closedThisMonth = closed.filter((lead) => lead.wonAt && sameMonth(new Date(lead.wonAt), now))
  const sum = (list: typeof leads) => list.reduce((total, lead) => total + leadValue(lead), 0)

  return {
    totalLeads: leads.length,
    activeCount: open.length,
    openCount: open.length,
    openValue: sum(open),
    closedCount: closed.length,
    closedValue: sum(closed),
    closedMonthCount: closedThisMonth.length,
    closedMonthValue: sum(closedThisMonth),
    contactedCount: contacted.length,
    respondedCount: responded.length,
    responseRate: contacted.length > 0 ? responded.length / contacted.length : null,
    conversionRate: leads.length > 0 ? closed.length / leads.length : null,
  }
}

/** Open value by work stage, excluding wins and losses. */
export function openValueByStage(board: PipelineBoard): { id: string; name: string; value: number }[] {
  return board.stages.filter((stage) => !['WON', 'LOST'].includes(stage.stageType)).map((stage) => ({
    id: stage.id,
    name: stage.name,
    value: stage.leads.reduce((total, lead) => total + leadValue(lead), 0),
  }))
}

/** Leads created per local day for the last `days` days. */
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

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
