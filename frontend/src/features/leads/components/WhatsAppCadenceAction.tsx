import { useEffect, useRef, useState } from 'react'
import { WhatsAppIcon } from '../../../brand/icons.tsx'
import { Button } from '../../../components/ui/Button.tsx'
import { defaultWhatsAppMessage, whatsappUrl } from '../../../lib/format.ts'
import { useRecordWhatsAppSent } from '../hooks.ts'
import type { Lead } from '../types.ts'

/**
 * Abre o WhatsApp com texto pronto. O envio continua manual no WhatsApp;
 * ao retornar à aba, o usuário confirma e o backend registra a cadência.
 */
export function WhatsAppCadenceAction({
  lead,
  message: suggestedMessage,
  showLabel = false,
  className = '',
}: {
  lead: Lead
  message?: string
  showLabel?: boolean
  className?: string
}) {
  const record = useRecordWhatsAppSent(lead.id)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [opening, setOpening] = useState(false)
  const pendingRef = useRef<number | null>(null)

  useEffect(() => {
    function handleFocus() {
      const openedAt = pendingRef.current
      if (openedAt === null || Date.now() - openedAt < 500) return
      pendingRef.current = null
      setOpening(false)
      setConfirming(true)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const readyMessage = suggestedMessage ?? defaultWhatsAppMessage(lead.name)
  const url = lead.phone ? whatsappUrl(lead.phone, readyMessage) : null
  if (!url) return null
  const whatsappLink = url

  function openWhatsApp() {
    setMessage(readyMessage)
    pendingRef.current = Date.now()
    setOpening(true)
    const popup = window.open(whatsappLink, '_blank', 'noopener,noreferrer')
    if (!popup) {
      pendingRef.current = null
      setOpening(false)
      setConfirming(true)
    }
  }

  function confirmSent() {
    record.mutate(message, {
      onSuccess: () => setConfirming(false),
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          openWhatsApp()
        }}
        disabled={opening || record.isPending}
        aria-label={`Abrir WhatsApp para ${lead.name}`}
        title="Abrir no WhatsApp com mensagem pronta"
        className={`inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm text-cyan transition-colors hover:bg-cyan-tint disabled:cursor-wait disabled:opacity-60 ${showLabel ? 'border border-navy-600 px-3 text-small font-bold' : 'w-8'} ${className}`}
      >
        <WhatsAppIcon aria-hidden size={18} />
        {showLabel && (opening ? 'Abrindo…' : 'Abrir no WhatsApp')}
      </button>

      {confirming && (
        <div
          role="alertdialog"
          aria-label={`Confirmação de envio para ${lead.name}`}
          className="fixed right-4 bottom-4 z-50 w-[min(380px,calc(100vw-32px))] rounded-lg border border-navy-600 bg-navy-800 p-4 text-white shadow-float"
        >
          <p className="text-ui font-bold">Enviou a mensagem para {lead.name}?</p>
          <p className="mt-1 text-small text-slate-400">Só confirme se você clicou em enviar no WhatsApp.</p>
          {record.error && <p className="mt-2 text-small text-danger">Não foi possível registrar. Tente de novo.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="h-9 px-3.5" onClick={confirmSent} disabled={record.isPending}>
              {record.isPending ? 'Registrando…' : 'Sim, enviei'}
            </Button>
            <Button variant="secondary" className="h-9 px-3.5" onClick={() => setConfirming(false)} disabled={record.isPending}>
              Não enviei
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
