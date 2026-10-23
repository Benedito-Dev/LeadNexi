import { elapsedDays, followUpTone, formatDateTime, formatDay, formatElapsed } from '../../lib/format.ts'
import type { Lead } from '../leads/types.ts'
import type { Stage } from './types.ts'

/**
 * Tom do próximo passo, do mais urgente ao mais calmo:
 * hot = o lead está esperando você (respondeu); overdue = passou da hora; today = é hoje;
 * go = dá para fazer agora (1ª mensagem, marcar reunião); scheduled = tem data no futuro;
 * done = fechou; idle = nada a fazer por enquanto.
 */
export type NextActionTone = 'hot' | 'overdue' | 'today' | 'go' | 'scheduled' | 'done' | 'idle'

export type NextActionIcon = 'reply' | 'bell' | 'send' | 'calendar' | 'wait' | 'check' | 'clock' | 'lost'

export interface NextAction {
  label: string
  tone: NextActionTone
  icon: NextActionIcon
  /** Data por trás do passo (follow-up, reunião), para o `<time>` e a dica */
  dateTime?: string
  title?: string
}

/** O lead pede uma ação sua agora (o WhatsApp do card fica sempre à vista) */
export function isActionable(action: NextAction | null): boolean {
  return action !== null && ['hot', 'overdue', 'today', 'go'].includes(action.tone)
}

/**
 * Próximo passo do lead no funil, pela etapa e pelas datas (follow-up, reunião). É o que o card mostra
 * no rodapé no lugar de "Sem valor": o card diz o que fazer, não só onde o lead está.
 */
export function nextAction(lead: Lead, stageType: Stage['stageType'], now = new Date()): NextAction | null {
  if (stageType === 'WON') return { label: 'Cliente', tone: 'done', icon: 'check' }
  if (stageType === 'LOST') return lead.lostReason ? { label: lead.lostReason, tone: 'idle', icon: 'lost' } : null

  if (lead.meetingAt) {
    const tone = followUpTone(lead.meetingAt, now)
    const time = new Date(lead.meetingAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return {
      label: tone === 'overdue' ? 'Reunião passou · atualizar' : tone === 'today' ? `Reunião hoje · ${time}` : `Reunião · ${formatDay(new Date(lead.meetingAt), now)}`,
      tone: tone === 'future' ? 'scheduled' : tone,
      icon: 'calendar',
      dateTime: lead.meetingAt,
      title: `Reunião: ${formatDateTime(lead.meetingAt, now)}`,
    }
  }

  if (stageType === 'RESPONDED') {
    const elapsed = formatElapsed(lead.updatedAt, now.getTime())
    return {
      label: elapsed === 'agora' ? 'Responder agora' : `Responder · há ${elapsed}`,
      tone: 'hot',
      icon: 'reply',
      dateTime: lead.updatedAt,
      title: 'Ele respondeu e está esperando você',
    }
  }

  if (lead.followUpAt) {
    const tone = followUpTone(lead.followUpAt, now)
    // Na fila ainda não houve contato: a data é de quando mandar a 1ª mensagem
    if (stageType === 'CONTACT') {
      return {
        label: tone === 'overdue' ? '1ª mensagem atrasada' : tone === 'today' ? 'Enviar 1ª mensagem hoje' : `1ª mensagem · ${formatDay(new Date(lead.followUpAt), now)}`,
        tone: tone === 'future' ? 'scheduled' : tone,
        icon: 'send',
        dateTime: lead.followUpAt,
        title: `Primeiro contato previsto: ${formatDateTime(lead.followUpAt, now)}`,
      }
    }
    const name = lead.cadenceStep === 2 ? 'Follow-up final' : lead.cadenceStep ? `Follow-up ${lead.cadenceStep}` : 'Retorno'
    return {
      label: tone === 'overdue' ? `${name} atrasado` : tone === 'today' ? `${name} hoje` : `${name} · ${formatDay(new Date(lead.followUpAt), now)}`,
      tone: tone === 'future' ? 'scheduled' : tone,
      icon: 'bell',
      dateTime: lead.followUpAt,
      title: `Próximo contato: ${formatDateTime(lead.followUpAt, now)}${lead.followUpNote ? ` · ${lead.followUpNote}` : ''}`,
    }
  }

  if (stageType === 'CONTACT') return { label: 'Enviar 1ª mensagem', tone: 'go', icon: 'send' }
  if (stageType === 'MEETING') return { label: 'Marcar a data', tone: 'go', icon: 'calendar' }
  if (stageType === 'PROPOSAL') return { label: 'Cobrar retorno', tone: 'go', icon: 'send' }
  if (stageType === 'SENT') return { label: 'Aguardando resposta', tone: 'idle', icon: 'wait' }

  const days = elapsedDays(lead.updatedAt, now.getTime())
  return {
    label: days === 0 ? `Movido há ${formatElapsed(lead.updatedAt, now.getTime())}` : `${days} d parado`,
    tone: days >= 7 ? 'overdue' : days >= 3 ? 'today' : 'idle',
    icon: 'clock',
    dateTime: lead.updatedAt,
    title: 'Última movimentação',
  }
}

/** Etapas em que o lead está "quente": falta pouco para virar venda */
export const HOT_STAGES: Stage['stageType'][] = ['RESPONDED', 'MEETING', 'PROPOSAL']

/** Texto da coluna vazia: um convite para o próximo degrau, não um "arraste aqui" */
export const EMPTY_STAGE_COPY: Record<Stage['stageType'], string> = {
  CONTACT: 'Fila zerada. Importe novas lojas para continuar.',
  SENT: 'Quem receber sua mensagem espera aqui.',
  RESPONDED: 'Quem responder aparece aqui.',
  MEETING: 'Sua próxima reunião aparece aqui.',
  PROPOSAL: 'Propostas na mesa ficam aqui.',
  WON: 'Seu próximo cliente fecha aqui.',
  LOST: 'Ninguém perdido por aqui.',
  CUSTOM: 'Arraste um card para cá.',
}
