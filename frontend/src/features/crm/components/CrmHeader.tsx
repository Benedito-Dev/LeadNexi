import { Kanban, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatarReais } from '../filtros'

type CrmHeaderProps = {
  nomePipeline?: string
  totalLeads: number
  emAberto: number
  podeCriarLead: boolean
  onNovoLead: () => void
  onConfigurarPipelines: () => void
}

/** Card do topo do quadro: título, resumo do pipeline aberto e as ações. */
export function CrmHeader({ nomePipeline, totalLeads, emAberto, podeCriarLead, onNovoLead, onConfigurarPipelines }: CrmHeaderProps) {
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4 font-marca">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-leadnexi-violet/15 text-leadnexi-violet">
            <Kanban className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">Funil de vendas</h1>
            <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">
              <span className="font-bold tabular-nums text-foreground">{totalLeads}</span> {totalLeads === 1 ? 'lead' : 'leads'}
              {nomePipeline && (
                <>
                  {' em '}
                  <span className="font-semibold text-foreground">{nomePipeline}</span>
                </>
              )}
              {emAberto > 0 && (
                <>
                  {' · '}
                  <span className="font-bold tabular-nums text-foreground">{formatarReais(emAberto)}</span> em aberto
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-border font-semibold text-foreground hover:bg-accent"
            onClick={onConfigurarPipelines}
          >
            <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Pipelines
          </Button>
          <Button
            className="gap-2 bg-leadnexi-violet-600 font-bold text-leadnexi-on-accent hover:bg-leadnexi-violet-600/90"
            onClick={onNovoLead}
            disabled={!podeCriarLead}
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Novo lead
          </Button>
        </div>
      </div>
    </section>
  )
}
