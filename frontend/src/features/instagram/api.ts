import { api, corpo } from '@/lib/api'
import type { AppDaMeta, SituacaoDaConta } from './tipos'

export const buscarConta = () => api<SituacaoDaConta>('/instagram/account')

export const buscarAppDaMeta = () => api<AppDaMeta>('/instagram/settings')

/** Salva o app da Meta; sem `appSecret`, mantém a chave já salva. */
export const salvarAppDaMeta = (dados: { appId: string; appSecret?: string }) =>
  api<AppDaMeta>('/instagram/settings', { method: 'PUT', body: corpo(dados) })

/** Link do login oficial do Instagram (o navegador vai para ele). */
export const iniciarConexao = () => api<{ url: string }>('/instagram/connect', { method: 'POST' })

export const desconectar = () => api<void>('/instagram/account', { method: 'DELETE' })
