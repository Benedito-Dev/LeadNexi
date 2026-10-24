import type { StageType } from './types'

export const COR_PADRAO_ETAPA = '#3B82F6'

/** O tipo diz o que a etapa faz no LeadNexi (ex.: "Fechou" cria a ficha de cliente). */
export const ROTULO_TIPO_ETAPA: Record<StageType, string> = {
  CONTACT: 'A contatar',
  SENT: 'Mensagem enviada',
  RESPONDED: 'Respondeu',
  MEETING: 'Reunião marcada',
  PROPOSAL: 'Proposta enviada',
  WON: 'Fechou',
  LOST: 'Perdido',
  CUSTOM: 'Personalizada',
}

export const OPCOES_TIPO_ETAPA = (Object.keys(ROTULO_TIPO_ETAPA) as StageType[]).map((valor) => ({
  value: valor,
  label: ROTULO_TIPO_ETAPA[valor],
}))
