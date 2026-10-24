import { formatarDecorrido, formatarDia, formatarDiaEHora, mensagemPadrao } from './textos'
import type { LeadDoPainel, PainelDeHoje } from './tipos'

export type TipoMissao = 'response' | 'follow-up' | 'new' | 'meeting'
export type Missao = { tipo: TipoMissao; lead: LeadDoPainel }

// Placar de jogo (BRAND.md, seção 9.2): cada tipo de missão tem um tom; destaque por cor sólida, sem brilho.
export const TIPOS: Record<TipoMissao, { titulo: string; ponto: string; faixa: string }> = {
  response: { titulo: 'Responder primeiro', ponto: 'bg-leadnexi-cyan', faixa: 'border-t-leadnexi-cyan' },
  'follow-up': { titulo: 'Follow-ups', ponto: 'bg-warn-foreground', faixa: 'border-t-warn-foreground' },
  new: { titulo: 'Novas lojas', ponto: 'bg-leadnexi-violet', faixa: 'border-t-leadnexi-violet' },
  meeting: { titulo: 'Compromissos', ponto: 'bg-muted-foreground', faixa: 'border-t-muted-foreground' },
}

/** Missões que contam no anel do placar (compromissos não se "marcam como feitos"). */
export const TIPOS_DE_ACAO: TipoMissao[] = ['response', 'follow-up', 'new']

/** "Semana de ouro": bater a meta diária 5 dias seguidos. */
export const SEMANA_DE_OURO = 5

export const DIAS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export const hojeEmFortaleza = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export const inicioDeHoje = () => {
  const data = new Date()
  data.setHours(0, 0, 0, 0)
  return data
}

export const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

export function montarFila(painel: PainelDeHoje): Missao[] {
  const fimDeHoje = new Date()
  fimDeHoje.setHours(23, 59, 59, 999)
  const respostas = painel.responses.map((lead) => ({ tipo: 'response' as const, lead }))
  const followUps = painel.followUps
    .filter((lead) => lead.followUpAt && new Date(lead.followUpAt).getTime() <= fimDeHoje.getTime() && lead.stage.stageType !== 'RESPONDED')
    .map((lead) => ({ tipo: 'follow-up' as const, lead }))
  const novas = painel.newContacts.map((lead) => ({ tipo: 'new' as const, lead }))
  const compromissos = painel.meetings.map((lead) => ({ tipo: 'meeting' as const, lead }))
  return [...respostas, ...followUps, ...novas, ...compromissos]
}

/** Frase do placar: puxa para a próxima ação, nunca cobra. */
export function fraseDoProgresso(feitas: number, total: number, primeira?: Missao) {
  if (total === 0) return 'Nada na fila agora.'
  if (feitas >= total) return 'Missões completas. Mandou bem!'
  if (feitas === 0) return primeira?.tipo === 'response' ? `Comece por ${primeira.lead.name}. Respondeu!` : 'Bora abrir o dia?'
  const faltam = total - feitas
  if (faltam === 1) return 'Falta só 1!'
  if (feitas / total >= 0.5) return `Passou da metade. Faltam ${faltam}.`
  return `Ritmo bom. Faltam ${faltam}.`
}

/** Os três textos da cadência, para trocar com um clique (1ª mensagem, retomada e a última). */
export function modelosDeMensagem(lead: LeadDoPainel): { rotulo: string; texto: string }[] {
  return [
    { rotulo: '1ª mensagem', texto: mensagemPadrao(lead.name) },
    {
      rotulo: 'Retomada',
      texto: `Oi! Só retomando a mensagem de ${formatarDia(new Date(lead.updatedAt))}. Se fizer sentido, te mando um exemplo de anúncio pra ${lead.name}, sem compromisso. Se não for o momento, tudo bem também.`,
    },
    {
      rotulo: 'Última',
      texto: `Última mensagem pra não te incomodar 🙂 Se um dia quiser uma análise grátis dos anúncios da ${lead.name}, é só me chamar aqui.`,
    },
  ]
}

/** O texto que a missão já abre: o passo da cadência em que o lead está. */
export function mensagemSugerida(lead: LeadDoPainel, tipo: TipoMissao): string {
  const [primeira, retomada, ultima] = modelosDeMensagem(lead)
  if (tipo === 'follow-up' && lead.cadenceStep === 1) return retomada.texto
  if (tipo === 'follow-up' && lead.cadenceStep === 2) return ultima.texto
  return primeira.texto
}


/** Linha de contexto da missão ("Respondeu há 24 min", "Follow-up 1 · venceu há 2 d") e a cor dela. */
export function contextoDaMissao(lead: LeadDoPainel, tipo: TipoMissao): { texto: string; cor: string; atrasado: boolean } {
  const atrasado = tipo === 'follow-up' && lead.followUpAt !== null && new Date(lead.followUpAt) < inicioDeHoje()
  const texto =
    tipo === 'response'
      ? `Respondeu há ${formatarDecorrido(lead.updatedAt)}`
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
