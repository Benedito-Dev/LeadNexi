import { useState } from 'react'
import { Check, Trophy } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { addToast } from '@/lib/toast'
import { agendarContato } from '../../crm/api'
import { type TipoMissao } from '../missoes'
import { formatarDiaEHora } from '../textos'
import type { LeadDoPainel } from '../tipos'

export type AcoesDaMissao = { onAbrir: (lead: LeadDoPainel) => void; onMudou: () => void }

export function EtiquetasDoLead({ lead }: { lead: LeadDoPainel }) {
  return (
    <>
      {lead.adStatus === 'anuncia' && (
        <span className="rounded-full bg-leadnexi-violet/15 px-2 py-0.5 text-[11px] font-extrabold text-leadnexi-violet-texto">Anuncia</span>
      )}
      {lead.phoneType === 'fixo' && (
        <span className="rounded-full bg-warn px-2 py-0.5 text-[11px] font-extrabold text-warn-foreground">Fixo · talvez sem WhatsApp</span>
      )}
      {lead.isNetwork && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-extrabold text-muted-foreground">Rede</span>}
    </>
  )
}

/** Adia o próximo contato (amanhã, em 3 dias ou próxima segunda, às 10h). */
export function MenuAdiar({ leadId, onAdiado, className }: { leadId: string; onAdiado: () => void; className?: string }) {
  const [agora] = useState(() => new Date())
  const opcoes = [
    { rotulo: 'Amanhã', dias: 1 },
    { rotulo: 'Em 3 dias', dias: 3 },
    { rotulo: 'Próxima segunda', dias: null },
  ] as const

  const adiar = async (dias: number | null) => {
    const data = new Date(agora)
    if (dias === null) data.setDate(data.getDate() + ((8 - data.getDay()) % 7 || 7))
    else data.setDate(data.getDate() + dias)
    data.setHours(10, 0, 0, 0)
    try {
      await agendarContato(leadId, data.toISOString())
      addToast('success', 'Contato adiado', formatarDiaEHora(data.toISOString()))
      onAdiado()
    } catch {
      addToast('error', 'Não foi possível adiar', 'Tente de novo.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn('cursor-pointer text-[13px] font-bold text-muted-foreground hover:text-foreground', className)}>
          Adiar
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="font-marca">
        {opcoes.map((opcao) => (
          <DropdownMenuItem key={opcao.rotulo} onSelect={() => void adiar(opcao.dias)} className="font-medium">
            {opcao.rotulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FilaVazia({ feitasHoje }: { feitasHoje: number }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-leadnexi-violet-600 text-leadnexi-on-accent">
        <Trophy aria-hidden className="h-[26px] w-[26px]" strokeWidth={1.75} />
      </span>
      <p className="mb-0 mt-4 text-2xl font-extrabold text-foreground">{feitasHoje > 0 ? 'Missões do dia completas' : 'Fila zerada'}</p>
      <p className="mx-auto mb-0 mt-2 max-w-md text-base text-muted-foreground">
        {feitasHoje > 0
          ? `${feitasHoje} ${feitasHoje === 1 ? 'ação feita' : 'ações feitas'} hoje. Amanhã a fila nova chega sozinha.`
          : 'Nenhuma ação pendente agora. Que tal puxar novas lojas da lista ativa?'}
      </p>
    </div>
  )
}

export function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando placar do dia" className="grid items-start gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:gap-7">
      <div className="h-[640px] animate-pulse rounded-2xl border border-border bg-card" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  )
}

/** Círculo de concluído (follow-up feito, ou 1ª mensagem já mandada). */
export function CirculoConcluir({
  lead,
  tipo,
  feita,
  ocupado,
  onConcluir,
}: {
  lead: LeadDoPainel
  tipo: TipoMissao
  feita: boolean
  ocupado: boolean
  onConcluir: () => void
}) {
  return (
    <button
      type="button"
      onClick={onConcluir}
      disabled={ocupado || feita}
      aria-label={tipo === 'new' ? `Já mandei a 1ª mensagem para ${lead.name}` : `Marcar follow-up de ${lead.name} como feito`}
      title={tipo === 'new' ? 'Já mandei' : 'Feito'}
      className={cn(
        'grid shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors disabled:cursor-default',
        'h-12 w-12',
        feita
          ? 'border-success-foreground bg-success-foreground text-card'
          : 'border-border text-muted-foreground hover:border-success-foreground hover:text-success-foreground',
      )}
    >
      <Check aria-hidden className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}

