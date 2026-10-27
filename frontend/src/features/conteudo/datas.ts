export type Modo = 'semana' | 'mes'

/** "2026-10-16" no horário local (chave do dia). */
export function chaveDoDia(data: Date) {
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`
}

export function somarDias(data: Date, dias: number) {
  const resultado = new Date(data)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

/** Segunda-feira da semana da data, à meia-noite. */
function inicioDaSemana(data: Date) {
  const resultado = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  return somarDias(resultado, -((resultado.getDay() + 6) % 7))
}

/** Dias mostrados: a semana, ou as semanas inteiras que cobrem o mês. */
export function diasVisiveis(modo: Modo, ancora: Date): Date[] {
  if (modo === 'semana') {
    const inicio = inicioDaSemana(ancora)
    return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i))
  }
  const primeiro = new Date(ancora.getFullYear(), ancora.getMonth(), 1)
  const ultimo = new Date(ancora.getFullYear(), ancora.getMonth() + 1, 0)
  const inicio = inicioDaSemana(primeiro)
  const total = Math.ceil(((ultimo.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7) * 7
  return Array.from({ length: total }, (_, i) => somarDias(inicio, i))
}
