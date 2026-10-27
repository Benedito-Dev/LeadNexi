import type { Conversa } from './tipos'

export type Filtro = 'todas' | 'sua-vez' | 'leads' | 'nao-leads'

export const FILTROS: [Filtro, string][] = [
  ['todas', 'Todas'],
  ['sua-vez', 'Sua vez'],
  ['leads', 'Leads'],
  ['nao-leads', 'Não é lead'],
]

/** A pessoa escreveu por último e ainda dá para responder: é a sua vez. */
export const esperandoVoce = (c: Conversa) => c.canReply && c.lastMessage?.direction === 'received'
