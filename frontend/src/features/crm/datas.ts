/** "AAAA-MM-DD" no fuso de quem está usando. */
export function diaLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

/** Dia (local) daqui a `deslocamento` dias. */
export function diaDaquiA(deslocamento: number): string {
  const data = new Date()
  data.setDate(data.getDate() + deslocamento)
  return diaLocal(data)
}

/** O próximo contato cai hoje? (a bolinha vermelha do card) */
export function ehHoje(iso: string | null): boolean {
  return Boolean(iso) && diaLocal(new Date(iso as string)) === diaDaquiA(0)
}
