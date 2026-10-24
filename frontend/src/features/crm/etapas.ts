import type { ComponentType, CSSProperties } from 'react'
import { CalendarCheck, CircleX, FileText, Layers, MessageSquareReply, Send, Trophy, UserPlus } from 'lucide-react'
import type { Etapa, StageType } from './types'

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

/** Progressão do funil (BRAND.md, seção 8): violeta → azul → ciano; da 4ª etapa em diante, ciano. */
const CORES_DO_FUNIL = ['#6D5DFB', '#5C8AF6', '#3DB3F1', '#22D3EE']

/** Cor da etapa: a cadastrada, ou a da progressão do funil pela posição dela no quadro. */
export const corDaEtapa = (etapa: Pick<Etapa, 'color'>, indice: number) =>
  etapa.color || CORES_DO_FUNIL[Math.min(indice, CORES_DO_FUNIL.length - 1)]

type IconeDeEtapa = ComponentType<{ className?: string; strokeWidth?: number; style?: CSSProperties; 'aria-hidden'?: boolean }>

/** Ícone de cada tipo de etapa (o que acontece com o lead ali). */
export const ICONE_DA_ETAPA: Record<StageType, IconeDeEtapa> = {
  CONTACT: UserPlus,
  SENT: Send,
  RESPONDED: MessageSquareReply,
  MEETING: CalendarCheck,
  PROPOSAL: FileText,
  WON: Trophy,
  LOST: CircleX,
  CUSTOM: Layers,
}
