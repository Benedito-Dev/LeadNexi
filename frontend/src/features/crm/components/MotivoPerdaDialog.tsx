import { useState } from 'react'
import { MutaseDialog } from '@/components/modal/MutaseDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type MotivoPerdaDialogProps = {
  /** Nome do lead que está indo para a etapa de perda; `null` = fechado. */
  leadNome: string | null
  onConfirmar: (motivo: string) => void
  onCancelar: () => void
}

/**
 * O LeadNexi exige o motivo ao mover para uma etapa de perda (o Rizar não tem essa regra, então
 * este modal não tem par lá; segue o mesmo modal padrão).
 */
export function MotivoPerdaDialog({ leadNome, onConfirmar, onCancelar }: MotivoPerdaDialogProps) {
  const [motivo, setMotivo] = useState('')

  const fechar = () => {
    setMotivo('')
    onCancelar()
  }

  return (
    <MutaseDialog
      open={leadNome !== null}
      onOpenChange={fechar}
      title="Motivo da perda"
      description={leadNome ? `Por que ${leadNome} não fechou?` : undefined}
    >
      <MutaseDialog.Body>
        <div className="space-y-1.5">
          <Label htmlFor="motivoPerda" className="required">
            Motivo
          </Label>
          <Textarea
            id="motivoPerda"
            autoFocus
            value={motivo}
            onChange={({ target }) => setMotivo(target.value)}
            placeholder="Ex.: achou caro, já tem fornecedor"
          />
        </div>
      </MutaseDialog.Body>
      <MutaseDialog.Footer>
        <Button variant="outline" onClick={fechar}>
          Cancelar
        </Button>
        <Button
          disabled={!motivo.trim()}
          onClick={() => {
            onConfirmar(motivo.trim())
            setMotivo('')
          }}
        >
          Mover
        </Button>
      </MutaseDialog.Footer>
    </MutaseDialog>
  )
}
