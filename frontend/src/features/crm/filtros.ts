import { toE164BR } from '@/lib/phone'
import { diaDaquiA, diaLocal } from './datas'
import type { EtapaDoQuadro, Lead, Opcao, StageType } from './types'

/** Atalhos do próximo contato. "Hoje", "Amanhã" e "Atrasados" olham só o funil em aberto. */
export type FiltroContato = 'todos' | 'hoje' | 'amanha' | 'atrasados' | 'periodo'

export type Filtros = {
  busca: string
  contato: FiltroContato
  periodoDe: string
  periodoAte: string
  origens: string[]
  ordenacao: string
}

export const ORDENACAO_PADRAO = '-created_at'

export const FILTROS_INICIAIS: Filtros = {
  busca: '',
  contato: 'todos',
  periodoDe: '',
  periodoAte: '',
  origens: [],
  ordenacao: ORDENACAO_PADRAO,
}

export const OPCOES_ORDENACAO: Opcao[] = [
  { value: '-created_at', label: 'Mais novos primeiro' },
  { value: 'created_at', label: 'Mais antigos primeiro' },
  { value: 'date_prox_contact', label: 'Próximo contato mais perto' },
  { value: '-date_prox_contact', label: 'Próximo contato mais longe' },
  { value: 'name', label: 'Nome (A-Z)' },
  { value: '-name', label: 'Nome (Z-A)' },
]

/** Algum filtro (fora a ordenação) está ligado? */
export const temFiltroAtivo = (f: Filtros) =>
  Boolean(f.busca.trim()) || f.contato !== 'todos' || f.origens.length > 0

const ETAPAS_FECHADAS: StageType[] = ['WON', 'LOST']
export const etapaEmAberto = (etapa: { stageType: StageType }) => !ETAPAS_FECHADAS.includes(etapa.stageType)

const valorDe = (lead: Lead) => Number(lead.estimatedValue ?? 0) || 0

/** Monta o teste de um lead para os filtros. A busca vale para nome ou telefone. */
export function criarFiltro(f: Filtros) {
  const busca = f.busca.trim().toLowerCase()
  const digitos = busca.replace(/\D/g, '')
  const buscaPorTelefone = digitos.length > 0 && digitos.length === busca.replace(/[\s()+-]/g, '').length
  const origens = new Set(f.origens)
  const hoje = diaDaquiA(0)
  const amanha = diaDaquiA(1)

  return (lead: Lead, etapa: EtapaDoQuadro) => {
    if (busca) {
      const achou = buscaPorTelefone
        ? toE164BR(lead.phone).includes(digitos) || (lead.phone ?? '').replace(/\D/g, '').includes(digitos)
        : lead.name.toLowerCase().includes(busca)
      if (!achou) return false
    }
    if (origens.size && !origens.has(lead.source ?? '')) return false
    if (f.contato === 'todos') return true

    if (!lead.followUpAt) return false
    const dia = diaLocal(new Date(lead.followUpAt))
    if (f.contato === 'periodo') {
      return !(f.periodoDe && dia < f.periodoDe) && !(f.periodoAte && dia > f.periodoAte)
    }
    if (!etapaEmAberto(etapa)) return false
    if (f.contato === 'hoje') return dia === hoje
    if (f.contato === 'amanha') return dia === amanha
    return dia < hoje
  }
}

export function criarOrdenacao(ordenacao: string): (a: Lead, b: Lead) => number {
  const sinal = ordenacao.startsWith('-') ? -1 : 1
  const campo = ordenacao.replace(/^-/, '')
  if (campo === 'name') return (a, b) => sinal * a.name.localeCompare(b.name, 'pt-BR')
  if (campo === 'date_prox_contact') {
    // Sem próximo contato marcado vai para o fim nos dois sentidos
    return (a, b) => {
      if (!a.followUpAt || !b.followUpAt) return Number(!a.followUpAt) - Number(!b.followUpAt)
      return sinal * a.followUpAt.localeCompare(b.followUpAt)
    }
  }
  return (a, b) => sinal * a.createdAt.localeCompare(b.createdAt)
}

export type Placar = { paraHoje: number; atrasados: number; emAberto: number; fechado: number; leads: number }

/** Números do placar, sobre o pipeline inteiro (não muda com os filtros). */
export function calcularPlacar(etapas: EtapaDoQuadro[]): Placar {
  const hoje = diaDaquiA(0)
  const placar: Placar = { paraHoje: 0, atrasados: 0, emAberto: 0, fechado: 0, leads: 0 }
  for (const etapa of etapas) {
    for (const lead of etapa.leads) {
      placar.leads += 1
      if (etapa.stageType === 'WON') {
        placar.fechado += valorDe(lead)
        continue
      }
      if (etapa.stageType === 'LOST') continue
      placar.emAberto += valorDe(lead)
      if (!lead.followUpAt) continue
      const dia = diaLocal(new Date(lead.followUpAt))
      if (dia === hoje) placar.paraHoje += 1
      else if (dia < hoje) placar.atrasados += 1
    }
  }
  return placar
}

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const formatarReais = (valor: number) => formatoReais.format(valor)
