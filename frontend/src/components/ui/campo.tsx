import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** Campo de formulário: rótulo em cima, o controle e uma dica opcional embaixo. */
export function Campo({ id, rotulo, dica, children }: { id: string; rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        {rotulo}
      </Label>
      {children}
      {dica && <p className="m-0 text-xs font-medium text-muted-foreground">{dica}</p>}
    </div>
  )
}
