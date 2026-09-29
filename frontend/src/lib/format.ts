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
