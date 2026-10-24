import { useEffect, useRef, useState } from 'react'
import { WhatsAppIcon } from '@/brand/icons'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { registrarWhatsAppEnviado } from '../api'
import { linkDoWhatsApp, mensagemPadrao } from '../textos'
import type { LeadDoPainel } from '../tipos'

type BotaoWhatsAppProps = {
  lead: LeadDoPainel
  mensagem?: string
  className?: string
  /** O envio foi confirmado e registrado (a cadência do lead andou). */
  onEnviado: () => void
}

/**
 * Abre o WhatsApp com a mensagem pronta (do LeadNexi antigo). O envio é manual no WhatsApp; ao
 * voltar para a aba, a pessoa confirma e o envio é registrado.
 */
export function BotaoWhatsApp({ lead, mensagem, className, onEnviado }: BotaoWhatsAppProps) {
  const [confirmando, setConfirmando] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState(false)
  const [enviada, setEnviada] = useState('')
  const abertoEm = useRef<number | null>(null)

  // Voltou para a aba depois de abrir o WhatsApp: pergunta se enviou
  useEffect(() => {
    const aoVoltar = () => {
      if (abertoEm.current === null || Date.now() - abertoEm.current < 500) return
      abertoEm.current = null
      setAbrindo(false)
      setConfirmando(true)
    }
    window.addEventListener('focus', aoVoltar)
    return () => window.removeEventListener('focus', aoVoltar)
  }, [])

  const texto = mensagem ?? mensagemPadrao(lead.name)
  const link = lead.phone ? linkDoWhatsApp(lead.phone, texto) : null
  if (!link) return null

  const abrir = () => {
    setEnviada(texto)
    abertoEm.current = Date.now()
    setAbrindo(true)
    if (!window.open(link, '_blank', 'noopener,noreferrer')) {
      abertoEm.current = null
      setAbrindo(false)
      setConfirmando(true)
    }
  }

  const confirmar = async () => {
    setRegistrando(true)
    setErro(false)
    try {
      await registrarWhatsAppEnviado(lead.id, enviada)
      setConfirmando(false)
      onEnviado()
    } catch {
      setErro(true)
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          abrir()
        }}
        disabled={abrindo || registrando}
        aria-label={`Abrir WhatsApp para ${lead.name}`}
        title="Abrir no WhatsApp com mensagem pronta"
        className={cn(
          'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-chat-wa-accent text-sm font-semibold text-chat-wa-accent-foreground transition-colors hover:bg-chat-wa-accent/90 disabled:cursor-wait disabled:opacity-60',
          'h-11 px-4',
          className,
        )}
      >
        <WhatsAppIcon aria-hidden size={18} />
        {abrindo ? 'Abrindo…' : 'Abrir no WhatsApp'}
      </button>

      {confirmando && (
        <div
          role="alertdialog"
          aria-label={`Confirmação de envio para ${lead.name}`}
          className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-32px))] rounded-xl border border-border bg-card p-4 font-marca text-foreground shadow-lg"
        >
          <p className="m-0 text-sm font-bold">Enviou a mensagem para {lead.name}?</p>
          <p className="mb-0 mt-1 text-[13px] font-medium text-muted-foreground">Só confirme se você clicou em enviar no WhatsApp.</p>
          {erro && <p className="mb-0 mt-2 text-[13px] text-leadnexi-danger">Não foi possível registrar. Tente de novo.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className={botaoPrincipalDoTopo} onClick={confirmar} disabled={registrando}>
              {registrando ? 'Registrando…' : 'Sim, enviei'}
            </Button>
            <Button size="sm" variant="outline" className={botaoSecundarioDoTopo} onClick={() => setConfirmando(false)} disabled={registrando}>
              Não enviei
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
