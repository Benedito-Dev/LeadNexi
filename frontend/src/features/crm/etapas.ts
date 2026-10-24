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

/** Cores oferecidas para a etapa: a progressão do funil e os estados da marca (BRAND.md, seção 4). */
export const CORES_DE_ETAPA = [
  { cor: '#6D5DFB', nome: 'Violeta' },
  { cor: '#5C8AF6', nome: 'Azul' },
  { cor: '#3DB3F1', nome: 'Céu' },
  { cor: '#22D3EE', nome: 'Ciano' },
  { cor: '#34D399', nome: 'Verde' },
  { cor: '#FBBF24', nome: 'Amarelo' },
  { cor: '#F87171', nome: 'Vermelho' },
  { cor: '#64748B', nome: 'Cinza' },
]
