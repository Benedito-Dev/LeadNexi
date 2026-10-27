import { api, corpo } from '@/lib/api'

/** Metas da prospecção (GET/PATCH /results/settings). */
export type Metas = {
  dailyTarget: number
  weeklyTarget: number
  monthlyRevenueGoal: number
  decisionContacts: number
  decisionMinReplies: number
}

/** Textos prontos da cadência. Vazio volta ao texto padrão; marcadores {saudacao}, {loja} e {data}. */
export type TextosProntos = { messageFirst: string; messageFollowUp: string; messageLast: string }

/** Tudo o que Configurações › Prospecção edita (GET/PATCH /results/settings). */
export type Prospeccao = Metas & TextosProntos

export const buscarProspeccao = () => api<Prospeccao>('/results/settings')

export const salvarProspeccao = (valores: Prospeccao) => api<Prospeccao>('/results/settings', { method: 'PATCH', body: corpo(valores) })

/** Senha de acesso do Claude ao servidor MCP (o token em si só vem ao criar). */
export type SenhaDoClaude = { id: string; name: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }

export const listarSenhasDoClaude = () => api<SenhaDoClaude[]>('/mcp/tokens')

export const criarSenhaDoClaude = (name: string) =>
  api<SenhaDoClaude & { token: string }>('/mcp/tokens', { method: 'POST', body: corpo({ name }) })

export const revogarSenhaDoClaude = (id: string) => api<SenhaDoClaude>(`/mcp/tokens/${id}`, { method: 'DELETE' })

/** Algo que o Claude fez num lead (vem do histórico, `via = "claude"`). */
export type AcaoDoClaude = {
  id: string
  type: string
  text: string | null
  toStage: string | null
  dueAt: string | null
  createdAt: string
  lead: { id: string; name: string }
}

export const listarAcoesDoClaude = () => api<AcaoDoClaude[]>('/mcp/actions')

type UsuarioSalvo = { id: string; email: string; name: string; avatarId: string | null }

/** Perfil (PATCH /auth/me): nome e e-mail de login. */
export const salvarPerfil = (dados: { name: string; email: string }) => api<UsuarioSalvo>('/auth/me', { method: 'PATCH', body: corpo(dados) })

/** Foto de perfil já recortada (JPEG quadrado). */
export const enviarFotoDePerfil = (foto: Blob) => {
  const arquivo = new FormData()
  arquivo.append('file', foto, 'foto.jpg')
  return api<UsuarioSalvo>('/auth/me/avatar', { method: 'POST', body: arquivo })
}

export const removerFotoDePerfil = () => api<UsuarioSalvo>('/auth/me/avatar', { method: 'DELETE' })

/** Troca a senha; as outras sessões são encerradas (esta continua). */
export const trocarSenha = (currentPassword: string, newPassword: string) =>
  api<void>('/auth/password', { method: 'POST', body: corpo({ currentPassword, newPassword }) })
