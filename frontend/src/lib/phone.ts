// Telefone BR, portado de `rizar/frontend/src/utils/phone.js`.

const DDI_BR = '55'
const somenteDigitos = (valor: unknown) => String(valor ?? '').replace(/\D/g, '')

/** Forma canônica `55DDDNÚMERO` (só dígitos), ou '' se não for um telefone BR plausível. */
export function toE164BR(valor: string | null | undefined): string {
  if (!valor) return ''
  const bruto = String(valor).trim()
  let digitos = somenteDigitos(bruto)
  let ddiDeclarado = bruto.startsWith('+')
  if (digitos.startsWith('00')) {
    digitos = digitos.slice(2)
    ddiDeclarado = true
  }
  if (ddiDeclarado && !digitos.startsWith(DDI_BR)) return ''
  while (digitos.length > 13 && digitos.startsWith(DDI_BR)) digitos = digitos.slice(2)

  if (digitos.length === 10 || digitos.length === 11) digitos = DDI_BR + digitos
  else if (digitos.length === 12 || digitos.length === 13) {
    if (!digitos.startsWith(DDI_BR)) return ''
  } else return ''

  const ddd = digitos.slice(2, 4)
  return ddd.length === 2 && !ddd.includes('0') ? digitos : ''
}

/** "(85) 99906-2339"; o valor cru se não der para entender. */
export function formatPhoneBR(valor: string | null | undefined): string {
  if (!valor) return ''
  const canonico = toE164BR(valor)
  if (!canonico) return String(valor)
  const ddd = canonico.slice(2, 4)
  const numero = canonico.slice(4)
  const corte = numero.length === 9 ? 5 : 4
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`
}

/** Máscara enquanto digita: "(85) 9990-6233" até 10 dígitos, "(85) 99906-2339" com 11. */
export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  const corte = d.length > 10 ? 7 : 6
  const meio = d.slice(2, corte)
  const fim = d.slice(corte)
  return `(${d.slice(0, 2)}) ${meio}${fim ? `-${fim}` : ''}`
}
