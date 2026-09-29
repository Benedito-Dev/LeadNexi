import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Dialog } from '../../../components/ui/Dialog.tsx'
import { Menu } from '../../../components/ui/Menu.tsx'
import { ApiError } from '../../../lib/api.ts'
import type { Stage } from '../../pipelines/types.ts'
import { useDeleteStage, useMoveStage } from '../hooks.ts'

/** Menu "⋯" do cabeçalho da coluna: renomear, mover e excluir a etapa. */
export function StageActions({
  stage,
  index,
  stageCount,
  leadCount,
  onRename,
}: {
  stage: Stage
  index: number
  stageCount: number
  leadCount: number
  onRename: () => void
}) {
  const moveStage = useMoveStage(stage.pipelineId)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <>
      <Menu
        label={`Ações da etapa ${stage.name}`}
        trigger={<MoreHorizontal aria-hidden size={16} strokeWidth={1.75} />}
        items={[
          { label: 'Renomear', icon: Pencil, onSelect: onRename },
          {
            label: 'Mover para a esquerda',
            icon: ArrowLeft,
            onSelect: () => moveStage(stage.id, -1),
            disabled: index === 0,
          },
          {
            label: 'Mover para a direita',
            icon: ArrowRight,
            onSelect: () => moveStage(stage.id, 1),
            disabled: index === stageCount - 1,
          },
          {
            label: 'Excluir etapa',
            icon: Trash2,
            onSelect: () => setConfirmingDelete(true),
            danger: true,
            disabled: leadCount > 0,
            hint: leadCount > 0 ? 'Mova os leads da etapa antes.' : undefined,
          },
        ]}
      />
      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Excluir etapa"
      >
        <DeleteStageConfirm stage={stage} onDone={() => setConfirmingDelete(false)} />
      </Dialog>
    </>
  )
}

function DeleteStageConfirm({ stage, onDone }: { stage: Stage; onDone: () => void }) {
  const remove = useDeleteStage()
  const error = remove.error
    ? remove.error instanceof ApiError && remove.error.status < 500
      ? remove.error.message
      : 'Não foi possível excluir. Tente de novo.'
    : null

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-slate-300">
        A etapa <strong className="font-bold text-white">{stage.name}</strong> será removida do funil. As outras
        colunas se reorganizam e mudam de cor conforme a nova posição.
      </p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate(stage.id, { onSuccess: onDone })}
        >
          <Trash2 aria-hidden size={18} strokeWidth={1.75} />
          Excluir etapa
        </Button>
      </div>
    </div>
  )
}
