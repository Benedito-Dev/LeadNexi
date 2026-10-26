export type SituacaoDoCliente = 'ACTIVE' | 'PAUSED' | 'ENDED'

/** Próxima cobrança: o primeiro mês sem pagamento registrado. */
export type Cobranca = {
  /** Mês a pagar: "2026-11" */
  period: string
  /** Vencimento: "2026-11-16" */
  dueDate: string
  /** Dias até o vencimento (negativo: atrasado) */
  daysUntil: number
  overdue: boolean
  /** Vence em até 3 dias (ou já venceu) */
  remind: boolean
}

export type Relatorio = {
  id: string
  /** Segunda-feira da semana: "2026-10-12" */
  weekStart: string
  /** Decimal como texto: "140.00" */
  spend: string
  conversations: number
  costPerConversation: number | null
  notes: string | null
  /** Mensagem-resumo pronta para mandar ao cliente */
  message: string
}

export type Pagamento = { id: string; amount: string; period: string; paidAt: string; note: string | null }

/** GET /clients e /clients/:id */
export type Cliente = {
  id: string
  leadId: string
  lead: { id: string; name: string; phone: string | null; instagramUsername: string | null; avatarId: string | null; responsibleName: string | null }
  status: SituacaoDoCliente
  plan: string
  monthlyFee: string
  startDate: string
  billingDay: number
  dailyAdBudget: string | null
  partnerAccess: boolean
  whatsappGreeting: boolean
  firstCampaignLive: boolean
  notes: string | null
  billing: Cobranca
  totals: { spend: string; conversations: number; costPerConversation: number | null }
  reports: Relatorio[]
  payments: Pagamento[]
  createdAt: string
}

export type AlteracaoDoCliente = Partial<{
  status: SituacaoDoCliente
  plan: string
  monthlyFee: number
  startDate: string
  billingDay: number
  dailyAdBudget: number | null
  partnerAccess: boolean
  whatsappGreeting: boolean
  firstCampaignLive: boolean
  notes: string | null
}>
