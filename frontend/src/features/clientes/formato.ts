import type { Cobranca, SituacaoDoCliente } from './tipos'

export const SITUACOES: Record<SituacaoDoCliente, { rotulo: string; classe: string }> = {
  ACTIVE: { rotulo: 'Ativo', classe: 'bg-success text-success-foreground' },
  PAUSED: { rotulo: 'Pausado', classe: 'bg-warn text-warn-foreground' },
  ENDED: { rotulo: 'Encerrado', classe: 'bg-muted text-muted-foreground' },
}

/** "2026-11-16" → "16/11" */
export const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

/** "2026-11" → "novembro de 2026" */
export function nomeDoMes(periodo: string) {
  const [ano, mes] = periodo.split('-').map(Number)
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** "Vence hoje" · "Vence em 3 dias (16/11)" · "Atrasado há 2 dias" */
export function textoDaCobranca(c: Cobranca) {
  if (c.daysUntil === 0) return 'Vence hoje'
  if (c.daysUntil === 1) return `Vence amanhã (${diaCurto(c.dueDate)})`
  if (c.daysUntil > 1) return `Vence em ${c.daysUntil} dias (${diaCurto(c.dueDate)})`
  const atraso = -c.daysUntil
  return `Atrasado há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`
}

export const corDaCobranca = (c: Cobranca) => (c.overdue ? 'text-leadnexi-danger' : c.remind ? 'text-warn-foreground' : 'text-foreground')

/** Segunda-feira da semana passada, no horário local: "2026-10-05" */
export function segundaDaSemanaPassada(agora = new Date()) {
  const data = new Date(agora)
  data.setDate(data.getDate() - 7 - ((data.getDay() + 6) % 7))
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`
}

/** Custo por conversa: "R$ 2,26"; sem conversa, "—" */
export const textoDoCusto = (custo: number | null) => (custo === null ? '—' : custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

/** Itens do checklist de entrada (o que fazer quando o cliente fecha). */
export const CHECKLIST = [
  { chave: 'partnerAccess', rotulo: 'Acesso de parceiro no Business Manager', dica: 'Pedir acesso de parceiro, nunca a senha.' },
  { chave: 'whatsappGreeting', rotulo: 'WhatsApp Business com saudação automática', dica: 'Quem chega pelo anúncio é respondido na hora.' },
  { chave: 'firstCampaignLive', rotulo: 'Primeira campanha no ar', dica: 'Campanha de mensagens, só perto da loja.' },
] as const
