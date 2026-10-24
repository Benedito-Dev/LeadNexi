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

export type SituacaoContato = { texto: string; tom: 'atrasado' | 'hoje' | 'amanha' | 'futuro' }

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Etiqueta do próximo contato no card, no lugar da bolinha vermelha: diz quando é e se atrasou
 * ("Atrasado 2 dias", "Hoje 15:00", "Amanhã 09:30", "Sex 24/10").
 */
export function situacaoDoContato(iso: string | null): SituacaoContato | null {
  if (!iso) return null
  const data = new Date(iso)
  const dia = diaLocal(data)
  const hoje = diaDaquiA(0)
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (dia < hoje) {
    const atraso = Math.round((new Date(`${hoje}T00:00`).getTime() - new Date(`${dia}T00:00`).getTime()) / 86_400_000)
    return { texto: `Atrasado ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`, tom: 'atrasado' }
  }
  if (dia === hoje) return { texto: `Hoje ${hora}`, tom: 'hoje' }
  if (dia === diaDaquiA(1)) return { texto: `Amanhã ${hora}`, tom: 'amanha' }
  const [, mes, d] = dia.split('-')
  return { texto: `${DIAS_CURTOS[data.getDay()]} ${d}/${mes}`, tom: 'futuro' }
}
