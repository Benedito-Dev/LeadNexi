const currencyFormat = (fractionDigits: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
const wholeCurrency = currencyFormat(0)
const centsCurrency = currencyFormat(2)

/** "297" → "R$ 297" · "1500.5" → "R$ 1.500,50" */
export function formatCurrency(value: string | number): string {
  const amount = typeof value === 'string' ? Number(value) : value
  return (Number.isInteger(amount) ? wholeCurrency : centsCurrency).format(amount)
}

/**
 * Converte o valor digitado ("1.500,50", "1500.5", "R$ 297") em número.
 * Retorna null se vazio e NaN se inválido.
 */
export function parseCurrency(input: string): number | null {
  const cleaned = input.replace(/R\$|\s/g, '')
  if (!cleaned) return null
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : Number.NaN
}

/** Tempo desde a data, curto: "agora", "12 min", "3 h", "5 d", "12/03" */
export function formatElapsed(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

/** 0.333 → "33%" */
export function formatPercent(ratio: number): string {
  return percent.format(ratio)
}

/**
 * Link do WhatsApp para o telefone: "+55 85 95555-7788" → "https://wa.me/5585955557788".
 * Número nacional (10 ou 11 dígitos, com DDD) ganha o 55 do Brasil. Retorna null se não parecer telefone.
 */
export function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  return full.length >= 12 && full.length <= 15 ? `https://wa.me/${full}` : null
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Dia relativo curto: "Hoje", "Amanhã", "Ontem" ou "qui., 02/10" */
export function formatDay(date: Date, now = new Date()): string {
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, now)) return 'Hoje'
  if (sameDay(date, tomorrow)) return 'Amanhã'
  if (sameDay(date, yesterday)) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

/** "Hoje às 14:00", "qui., 02/10 às 09:00" */
export function formatDateTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${formatDay(date, now)} às ${time}`
}

/** Tempo desde a data, para histórico: "agora", "há 12 min", "há 3 h", "há 5 d", "12/03" */
export function formatAgo(iso: string, now = Date.now()): string {
  const elapsed = formatElapsed(iso, now)
  return elapsed === 'agora' || elapsed.includes('/') ? elapsed : `há ${elapsed}`
}

export type FollowUpTone = 'overdue' | 'today' | 'future'

/** Situação do próximo contato: atrasado (já passou), hoje ou futuro. */
export function followUpTone(iso: string, now = new Date()): FollowUpTone {
  const date = new Date(iso)
  if (date.getTime() < now.getTime()) return 'overdue'
  return sameDay(date, now) ? 'today' : 'future'
}
