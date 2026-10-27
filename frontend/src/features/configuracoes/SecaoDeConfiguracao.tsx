import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Seção das telas de Configurações (dentro de um cartão só, separadas por linha): ícone, título e
 * o porquê à esquerda; os controles à direita.
 */
export function SecaoDeConfiguracao({ Icone, titulo, texto, children }: { Icone: LucideIcon; titulo: string; texto: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 p-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-12">
      <div>
        <h2 className="m-0 flex items-center gap-2 text-base font-extrabold text-foreground">
          <Icone aria-hidden className="h-[18px] w-[18px] text-leadnexi-violet-texto" strokeWidth={1.75} />
          {titulo}
        </h2>
        <p className="mb-0 mt-1 text-sm font-medium leading-6 text-muted-foreground">{texto}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** Campo com o ícone dentro, à esquerda; `direita` = um botão dentro do campo (ex.: mostrar a senha). */
export function CampoComIcone({ Icone, direita, className, ...input }: { Icone: LucideIcon; direita?: ReactNode } & ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Icone aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
      <Input {...input} className={cn('h-11 pl-10', direita && 'pr-11', className)} />
      {direita && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{direita}</div>}
    </div>
  )
}
