import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useCreateStage } from '../hooks.ts'
import { StageNameForm } from './StageNameForm.tsx'

/** Fim do quadro: botão discreto "+" (Nova etapa) que vira campo para criar uma etapa no fim. */
export function NewStageColumn({ pipelineId }: { pipelineId: string }) {
  const [editing, setEditing] = useState(false)
  const create = useCreateStage(pipelineId)

  if (!editing) {
    return (
      // Só o ícone, alinhado ao cabeçalho das colunas, para não empurrá-las; o rótulo fica no aria-label e no title
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Nova etapa"
        title="Nova etapa"
        className="mt-2.5 grid size-8 shrink-0 cursor-pointer place-items-center self-start rounded-xs text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-300"
      >
        <Plus aria-hidden size={18} strokeWidth={1.75} />
      </button>
    )
  }

  return (
    <div className="w-64 shrink-0 self-start rounded-lg bg-navy-850 p-2.5">
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
