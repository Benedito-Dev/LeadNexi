import { api, corpo } from '@/lib/api'
import type { AlteracaoDoCliente, Cliente } from './tipos'

export const listarClientes = () => api<Cliente[]>('/clients')

export const alterarCliente = (id: string, dados: AlteracaoDoCliente) => api<Cliente>(`/clients/${id}`, { method: 'PATCH', body: corpo(dados) })

/** Lança (ou corrige) o relatório de uma semana. */
export const salvarRelatorio = (id: string, dados: { weekStart: string; spend: number; conversations: number; notes?: string }) =>
  api<Cliente>(`/clients/${id}/reports`, { method: 'PUT', body: corpo(dados) })

export const apagarRelatorio = (id: string, relatorioId: string) => api<Cliente>(`/clients/${id}/reports/${relatorioId}`, { method: 'DELETE' })

export const registrarPagamento = (id: string, dados: { amount: number; period: string; note?: string }) =>
  api<Cliente>(`/clients/${id}/payments`, { method: 'POST', body: corpo(dados) })

export const apagarPagamento = (id: string, pagamentoId: string) => api<Cliente>(`/clients/${id}/payments/${pagamentoId}`, { method: 'DELETE' })
