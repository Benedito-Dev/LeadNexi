import type { Agente } from './api'

/** O que o personagem está fazendo agora, a partir da última execução. */
export type Estado = 'trabalhando' | 'terminou' | 'falhou' | 'dormindo'

const DIA_MS = 24 * 60 * 60 * 1000

export function estadoDoAgente(agente: Agente, agora = Date.now()): Estado {
  const ultima = agente.lastRun
  if (!ultima) return 'dormindo'
  if (ultima.status === 'RUNNING') return 'trabalhando'
  // O resultado fica na mesa por um dia; depois ele volta a dormir até o próximo horário
  const quando = new Date(ultima.finishedAt ?? ultima.startedAt).getTime()
  if (agora - quando > DIA_MS) return 'dormindo'
  return ultima.status === 'SUCCEEDED' ? 'terminou' : 'falhou'
}

export const ROTULO_DO_ESTADO: Record<Estado, string> = {
  trabalhando: 'Trabalhando',
  terminou: 'Terminou',
  falhou: 'Falhou',
  dormindo: 'Dormindo',
}
