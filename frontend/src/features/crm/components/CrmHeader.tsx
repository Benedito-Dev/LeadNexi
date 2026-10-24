import { Kanban, Plus, Settings2 } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { ListPageHeader } from '@/components/list-page/ListPageHeader'
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

/** Topo do quadro: título, resumo do pipeline aberto e as ações. */
export function CrmHeader({ nomePipeline, totalLeads, emAberto, podeCriarLead, onNovoLead, onConfigurarPipelines }: CrmHeaderProps) {
  return (
    <ListPageHeader
      icon={Kanban}
      title="Funil de vendas"
      summary={
        <>
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
        </>
      }
      actions={
        <>
          <Button variant="outline" size="sm" className={botaoSecundarioDoTopo} onClick={onConfigurarPipelines}>
            <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Pipelines
          </Button>
          <Button size="sm" className={botaoPrincipalDoTopo} onClick={onNovoLead} disabled={!podeCriarLead}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Novo lead
          </Button>
        </>
      }
    />
  )
}
