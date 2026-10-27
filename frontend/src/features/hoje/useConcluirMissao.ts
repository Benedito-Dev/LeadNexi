import { useState } from 'react'
import { addToast } from '@/lib/toast'
import { concluirContato, registrarWhatsAppEnviado, type OrigemDaMensagem } from './api'
import type { TipoMissao } from './missoes'
import type { LeadDoPainel } from './tipos'

/**
 * Concluir uma missão: follow-up marca o agendamento como feito; nova loja registra a 1ª mensagem
 * como enviada (avança a cadência). A missão fica marcada um instante e então sai da fila.
 */
export function useConcluirMissao(lead: LeadDoPainel, tipo: TipoMissao, onMudou: () => void) {
  const [feita, setFeita] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const podeMarcar = tipo === 'follow-up' || (tipo === 'new' && Boolean(lead.phone))

  // Vale para o círculo de concluído, o "Sim, enviei" depois do WhatsApp e o "Como ficou?" da conversa
  const marcarFeita = () => {
    setFeita(true)
    addToast('success', `Feito: ${lead.name}`, tipo === 'follow-up' ? 'Contato marcado como feito.' : tipo === 'response' ? 'Conversa registrada.' : 'Mensagem registrada.')
    setTimeout(onMudou, 700)
  }

  const concluir = async (mensagem: string, origem?: OrigemDaMensagem | null) => {
    if (ocupado || feita) return
    setOcupado(true)
    try {
      if (tipo === 'follow-up') await concluirContato(lead.id)
      else await registrarWhatsAppEnviado(lead.id, mensagem, origem)
      marcarFeita()
    } catch {
      addToast('error', 'Não foi possível registrar', 'Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  return { feita, ocupado, podeMarcar, concluir, marcarFeita }
}
