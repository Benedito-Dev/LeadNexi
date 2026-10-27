import { api, corpo } from '@/lib/api'

/** `GET /ai/status`: sem a chave da Anthropic no servidor, as ações de IA ficam desligadas. */
export type StatusDaIA = { configured: boolean; model: string }

/** Regra de ouro que o texto pode ter quebrado: número sem fonte ou promessa de resultado. */
export type AvisoDaIA = { kind: 'number' | 'promise'; detail: string }

export type OpcaoDeMensagem = { label: string; text: string; template: string; warnings: AvisoDaIA[] }

/** `POST /leads/:id/ai/message`: 1 mensagem principal + 2 variações. Nada é enviado. */
export type MensagemGerada = { suggestionId: string; model: string; step: number | null; options: OpcaoDeMensagem[] }

export const buscarStatusDaIA = () => api<StatusDaIA>('/ai/status')

export const gerarMensagem = (leadId: string, canal: 'whatsapp' | 'instagram' = 'whatsapp') =>
  api<MensagemGerada>(`/leads/${leadId}/ai/message`, { method: 'POST', body: corpo({ channel: canal }) })

/** Guarda qual opção foi usada (mede o que funciona). */
export const registrarOpcaoUsada = (suggestionId: string, chosenIndex: number) =>
  api<unknown>(`/ai/suggestions/${suggestionId}`, { method: 'PATCH', body: corpo({ chosenIndex }) })

/** `POST /leads/:id/ai/reply`: a intenção da última mensagem do lead e 2 respostas sugeridas. */
export type RespostaSugerida = {
  suggestionId: string
  intent: 'interested' | 'price' | 'objection' | 'forwarded' | 'auto_reply' | 'not_interested' | 'other'
  objection: string | null
  /** Aviso para você (ex.: "Parece resposta automática"). */
  warning: string | null
  options: { label: string; text: string; warnings: AvisoDaIA[] }[]
}

export const sugerirResposta = (leadId: string, canal: 'whatsapp' | 'instagram') =>
  api<RespostaSugerida>(`/leads/${leadId}/ai/reply`, { method: 'POST', body: corpo({ channel: canal }) })

/** Resumo do lead em 3 linhas; fica guardado no lead (`aiSummary`). */
export type ResumoDaIA = { situation: string; wants: string; nextStep: string; nextStepDays: number | null }

export const resumirLead = (leadId: string) =>
  api<ResumoDaIA & { generatedAt: string }>(`/leads/${leadId}/ai/summary`, { method: 'POST' })

/** `POST /ai/caption`: a IA vê as imagens do post e escreve a legenda. Nada é publicado. */
export const escreverLegenda = (imagens: Blob[]) => {
  const corpoDoEnvio = new FormData()
  imagens.forEach((imagem, i) => corpoDoEnvio.append('images', imagem, `imagem-${i + 1}.jpg`))
  return api<{ caption: string; warnings: AvisoDaIA[] }>('/ai/caption', { method: 'POST', body: corpoDoEnvio })
}
