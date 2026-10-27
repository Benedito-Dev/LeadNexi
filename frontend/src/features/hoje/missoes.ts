import { formatarDecorrido, formatarDiaEHora, preencherModelo } from './textos'
import type { LeadDoPainel, PainelDeHoje, TextosDaCadencia } from './tipos'

export type TipoMissao = 'response' | 'follow-up' | 'new' | 'meeting'
/** `textos`: os modelos da cadência salvos em Configurações › Prospecção. */
export type Missao = { tipo: TipoMissao; lead: LeadDoPainel; textos: TextosDaCadencia }

// Cada tipo de missão tem um tom; destaque por cor sólida, sem brilho.
export const TIPOS: Record<TipoMissao, { titulo: string; ponto: string; faixa: string }> = {
  response: { titulo: 'Sua vez', ponto: 'bg-leadnexi-cyan', faixa: 'border-t-leadnexi-cyan' },
  'follow-up': { titulo: 'Follow-ups', ponto: 'bg-warn-foreground', faixa: 'border-t-warn-foreground' },
  new: { titulo: 'Novas lojas', ponto: 'bg-leadnexi-violet', faixa: 'border-t-leadnexi-violet' },
  meeting: { titulo: 'Compromissos', ponto: 'bg-muted-foreground', faixa: 'border-t-muted-foreground' },
}

/** Missões que contam na meta do dia (compromissos não se "marcam como feitos"). */
export const TIPOS_DE_ACAO: TipoMissao[] = ['response', 'follow-up', 'new']

const inicioDeHoje = () => {
  const data = new Date()
  data.setHours(0, 0, 0, 0)
  return data
}

/** A fila do dia: respostas, follow-ups vencidos, novas lojas e compromissos. */
export function montarFila(painel: PainelDeHoje): Missao[] {
  const fimDeHoje = new Date()
  fimDeHoje.setHours(23, 59, 59, 999)
  const textos = painel.messageTemplates
  const respostas = painel.responses.map((lead) => ({ tipo: 'response' as const, lead, textos }))
  const followUps = painel.followUps
    .filter((lead) => lead.followUpAt && new Date(lead.followUpAt).getTime() <= fimDeHoje.getTime() && lead.stage.stageType !== 'RESPONDED')
    .map((lead) => ({ tipo: 'follow-up' as const, lead, textos }))
  const novas = painel.newContacts.map((lead) => ({ tipo: 'new' as const, lead, textos }))
  const compromissos = painel.meetings.map((lead) => ({ tipo: 'meeting' as const, lead, textos }))
  // Cada lead aparece uma vez só, na missão mais urgente (a ordem acima é a prioridade)
  const vistos = new Set<string>()
  return [...respostas, ...followUps, ...novas, ...compromissos].filter(({ lead }) => !vistos.has(lead.id) && Boolean(vistos.add(lead.id)))
}

/** Os três textos da cadência já preenchidos para o lead, para trocar com um clique. */
export function modelosDeMensagem({ lead, textos }: Missao): { rotulo: string; texto: string }[] {
  return [
    { rotulo: '1ª mensagem', texto: preencherModelo(textos.messageFirst, lead) },
    { rotulo: 'Retomada', texto: preencherModelo(textos.messageFollowUp, lead) },
    { rotulo: 'Última', texto: preencherModelo(textos.messageLast, lead) },
  ]
}

/** O texto que a missão já abre: o passo da cadência em que o lead está. */
export function mensagemSugerida(missao: Missao): string {
  const { lead, tipo } = missao
  const [primeira, retomada, ultima] = modelosDeMensagem(missao)
  if (tipo === 'follow-up' && lead.cadenceStep === 1) return retomada.texto
  if (tipo === 'follow-up' && lead.cadenceStep === 2) return ultima.texto
  return primeira.texto
}

/** Linha de contexto da missão ("Respondeu há 24 min", "Follow-up 1 · venceu há 2 d") e a cor dela. */
export function contextoDaMissao(lead: LeadDoPainel, tipo: TipoMissao): { texto: string; cor: string; atrasado: boolean } {
  const atrasado = tipo === 'follow-up' && lead.followUpAt !== null && new Date(lead.followUpAt) < inicioDeHoje()
  const texto =
    tipo === 'response'
      ? lead.followUpAt
        ? 'Retomar conversa · retorno combinado'
        : `Respondeu há ${formatarDecorrido(lead.updatedAt)}`
      : tipo === 'follow-up'
        ? `${lead.cadenceStep === 2 ? 'Follow-up final' : 'Follow-up 1'} · ${atrasado && lead.followUpAt ? `venceu há ${formatarDecorrido(lead.followUpAt)}` : 'hoje'}`
        : tipo === 'meeting'
          ? `Reunião · ${lead.meetingAt ? formatarDiaEHora(lead.meetingAt) : 'a confirmar'}`
          : [
              '1ª mensagem',
              lead.neighborhood,
              lead.googleRating !== null ? `★ ${lead.googleRating.toFixed(1).replace('.', ',')} (${lead.googleReviewCount ?? 0})` : null,
            ]
              .filter(Boolean)
              .join(' · ')
  const cor =
    tipo === 'response'
      ? 'text-leadnexi-cyan-texto'
      : atrasado
        ? 'text-warn-foreground'
        : tipo === 'new'
          ? 'text-leadnexi-violet-texto'
          : 'text-muted-foreground'
  return { texto, cor, atrasado }
}
