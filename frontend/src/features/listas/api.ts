import { api, corpo } from '@/lib/api'

/** Lista de prospecção com o placar dela (`GET /lead-lists`). */
export type Lista = {
  id: string
  name: string
  niche: string | null
  city: string | null
  /** Meta de contatos da lista, se houver */
  targetContacts: number | null
  archived: boolean
  leadCount: number
  /** Leads que já receberam mensagem (ou já passaram de "A contatar") */
  contacted: number
  /** Dos contatados, quantos responderam */
  replied: number
  won: number
  /** Regra de troca de Configurações › Prospecção: muitos contatos e poucas respostas */
  alert: boolean
  createdAt: string
}

export type DadosDaLista = { name: string; niche: string; city: string; targetContacts: number | null }

export const listarListas = () => api<Lista[]>('/lead-lists')

export const criarLista = (dados: DadosDaLista) => api<Lista>('/lead-lists', { method: 'POST', body: corpo(paraEnvio(dados)) })

export const editarLista = (id: string, dados: Partial<DadosDaLista> & { archived?: boolean }) =>
  api<Lista>(`/lead-lists/${id}`, { method: 'PATCH', body: corpo(paraEnvio(dados)) })

/** Campos vazios saem do envio (o servidor guarda nicho e cidade vazios como nada). */
function paraEnvio(dados: Partial<DadosDaLista> & { archived?: boolean }) {
  const { targetContacts, ...resto } = dados
  return { ...resto, ...(targetContacts !== undefined && targetContacts !== null ? { targetContacts } : {}) }
}
