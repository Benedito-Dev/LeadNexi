import type { ClientBilling, ClientStatus } from './types.ts'

export const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'Ativo', tone: 'text-success' },
  PAUSED: { label: 'Pausado', tone: 'text-warning' },
  ENDED: { label: 'Encerrado', tone: 'text-slate-400' },
}

/** "2026-11-16" → "16/11" */
export function shortDay(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`
}

/** "2026-11" → "novembro de 2026" */
export function monthLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** "Vence hoje" · "Vence em 3 dias (16/11)" · "Atrasado há 2 dias" */
export function billingLabel(billing: ClientBilling): string {
  if (billing.daysUntil === 0) return 'Vence hoje'
  if (billing.daysUntil === 1) return `Vence amanhã (${shortDay(billing.dueDate)})`
  if (billing.daysUntil > 1) return `Vence em ${billing.daysUntil} dias (${shortDay(billing.dueDate)})`
  const late = -billing.daysUntil
  return `Atrasado há ${late} ${late === 1 ? 'dia' : 'dias'}`
}

export function billingTone(billing: ClientBilling): string {
  return billing.overdue ? 'text-danger' : billing.remind ? 'text-warning' : 'text-slate-300'
}

/** Segunda-feira da semana passada, no horário local: "2026-10-05" */
export function lastWeekStart(now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() - 7 - ((date.getDay() + 6) % 7))
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "R$ 2,26" para o custo por conversa; sem conversa, "—" */
export function costLabel(cost: number | null): string {
  return cost === null ? '—' : cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
