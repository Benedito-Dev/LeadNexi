import { Button } from '../../../components/ui/Button.tsx'
import { Dialog } from '../../../components/ui/Dialog.tsx'
import { Dropdown } from '../../../components/ui/Dropdown.tsx'
import { Field } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { useState } from 'react'

const REASONS = [
  { value: 'Sem resposta', label: 'Sem resposta' },
  { value: 'Sem interesse', label: 'Sem interesse' },
  { value: 'Já tem alguém', label: 'Já tem alguém' },
  { value: 'Sem verba', label: 'Sem verba' },
  { value: 'Preço', label: 'Preço' },
  { value: 'Número sem WhatsApp', label: 'Número sem WhatsApp' },
  { value: 'Loja fechada', label: 'Loja fechada' },
  { value: 'Outro', label: 'Outro' },
]

export function LostReasonDialog({
  open,
  leadName,
  onClose,
  onConfirm,
}: {
  open: boolean
  leadName: string
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')
  const value = reason === 'Outro' ? other.trim() : reason

  function close() {
    setReason('')
    setOther('')
    onClose()
  }

  function confirm() {
    if (!value) return
    setReason('')
    setOther('')
    onConfirm(value)
  }

  return (
    <Dialog open={open} onClose={close} title="Por que foi perdido?">
      <div className="flex flex-col gap-5">
        <p className="text-body text-slate-300">
          Registre o motivo de <strong className="font-bold text-white">{leadName}</strong> para orientar os próximos contatos.
        </p>
        <Field label="Motivo da perda" htmlFor="lost-reason">
          <Dropdown
            id="lost-reason"
            value={reason}
            onChange={setReason}
            options={[{ value: '', label: 'Escolha um motivo' }, ...REASONS]}
          />
        </Field>
        {reason === 'Outro' && (
          <Field label="Descreva o motivo" htmlFor="lost-reason-other">
            <Input
              id="lost-reason-other"
              value={other}
              onChange={(event) => setOther(event.target.value)}
              maxLength={120}
              placeholder="Ex.: mudou de cidade"
              autoFocus
            />
          </Field>
        )}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} disabled={!value}>
            Mover para Perdido
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
