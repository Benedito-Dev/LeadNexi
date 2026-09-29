import { Dialog } from '../../../components/ui/Dialog.tsx'
import { LeadForm, type LeadFormTarget, type StageOption } from './LeadForm.tsx'
import { LeadPanel } from './LeadPanel.tsx'

export type { LeadFormTarget, StageOption } from './LeadForm.tsx'

/** Criar lead abre o modal com o formulário; abrir um lead existente abre o painel lateral (histórico + dados). */
export function LeadFormDialog({
  target,
  stages,
  onClose,
}: {
  target: LeadFormTarget | null
  stages: StageOption[]
  onClose: () => void
}) {
  return (
    <>
      <Dialog open={target?.mode === 'create'} onClose={onClose} title="Novo lead">
        {target?.mode === 'create' && <LeadForm target={target} stages={stages} onDone={onClose} />}
      </Dialog>
      <LeadPanel lead={target?.mode === 'edit' ? target.lead : null} stages={stages} onClose={onClose} />
    </>
  )
}
