/**
 * Lê o valor digitado em reais ("1.500,50", "1500.5", "R$ 297") como número.
 * Vazio vira null; texto que não é valor vira NaN.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '')
  if (!limpo) return null
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  return /^\d+(\.\d{1,2})?$/.test(normalizado) ? Number(normalizado) : Number.NaN
}

/** Valor em reais para preencher um campo: 1500.5 → "1.500,50", 297 → "297". */
export function reaisParaCampo(valor: number | string): string {
  const numero = Number(valor)
  return numero.toLocaleString('pt-BR', Number.isInteger(numero) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
