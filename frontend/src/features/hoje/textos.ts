// Formatação e textos da tela Hoje, do LeadNexi antigo (frontend/src/lib/format.ts).

/** Tempo desde a data, curto: "agora", "12 min", "3 h", "5 d", "12/03" */
export function formatarDecorrido(iso: string, agora = Date.now()): string {
  const minutos = Math.floor((agora - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return `${dias} d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Link do WhatsApp com a mensagem pronta: "+55 85 95555-7788" → "https://wa.me/5585955557788".
 * Número nacional (10 ou 11 dígitos) ganha o 55. `null` se não parecer telefone.
 */
export function linkDoWhatsApp(telefone: string, mensagem?: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  const completo = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos
  if (completo.length < 12 || completo.length > 15) return null
  return `https://wa.me/${completo}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

/**
 * Texto pronto a partir de um modelo da cadência: {saudacao} vira "Bom dia" / "Boa tarde" /
 * "Boa noite", {loja} o nome do lead e {data} o dia da última mensagem ("Hoje", "qui., 02/10").
 */
export function preencherModelo(modelo: string, lead: { name: string; updatedAt: string }, agora = new Date()): string {
  const saudacao = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  return modelo
    .replaceAll('{saudacao}', saudacao)
    .replaceAll('{loja}', lead.name)
    .replaceAll('{data}', formatarDia(new Date(lead.updatedAt), agora))
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Dia relativo curto: "Hoje", "Amanhã", "Ontem" ou "qui., 02/10" */
export function formatarDia(data: Date, agora = new Date()): string {
  const amanha = new Date(agora)
  amanha.setDate(agora.getDate() + 1)
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (mesmoDia(data, agora)) return 'Hoje'
  if (mesmoDia(data, amanha)) return 'Amanhã'
  if (mesmoDia(data, ontem)) return 'Ontem'
  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

/** "Hoje às 14:00", "qui., 02/10 às 09:00" */
export function formatarDiaEHora(iso: string): string {
  const data = new Date(iso)
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${formatarDia(data)} às ${hora}`
}
