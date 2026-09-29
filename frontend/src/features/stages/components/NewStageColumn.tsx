import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useCreateStage } from '../hooks.ts'
import { StageNameForm } from './StageNameForm.tsx'

/** Fim do quadro: botão "+" tracejado que vira campo para criar uma etapa no fim. */
export function NewStageColumn({ pipelineId }: { pipelineId: string }) {
  const [editing, setEditing] = useState(false)
  const create = useCreateStage(pipelineId)

  if (!editing) {
    return (
      // Estreito (só o ícone) para não empurrar as colunas; o rótulo fica no aria-label e no title
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Nova etapa"
        title="Nova etapa"
        className="grid h-13 w-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-dashed border-navy-600 text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-300"
      >
        <Plus aria-hidden size={18} strokeWidth={1.75} />
      </button>
    )
  }

  return (
    <div className="w-64 shrink-0 rounded-lg bg-navy-850 p-2.5">
      <div className="flex items-start px-1 pt-0.5">
        <StageNameForm
          label="Nome da nova etapa"
          saving={create.isPending}
          error={create.error}
          onSubmit={(name) =>
            create.mutate(name, {
              onSuccess: () => {
                create.reset()
                setEditing(false)
              },
            })
          }
          onCancel={() => {
            create.reset()
            setEditing(false)
          }}
        />
      </div>
    </div>
  )
}
