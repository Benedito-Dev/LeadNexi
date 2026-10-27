import { Archive, ArchiveRestore, FileUp, MoreHorizontal, Pencil, TriangleAlert } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Lista } from '../api'

type CartaoDaListaProps = {
  lista: Lista
  /** Da regra de troca (Configurações › Prospecção), para o texto do aviso */
  regra: { contatos: number; respostas: number } | null
  onEditar: () => void
  onImportar: () => void
  onArquivar: (arquivar: boolean) => void
}

const porcento = (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : '–')

/** Uma lista: nome, nicho e cidade, o placar (leads, contatados, responderam, fechados) e o aviso de troca. */
export function CartaoDaLista({ lista, regra, onEditar, onImportar, onArquivar }: CartaoDaListaProps) {
  const detalhe = [lista.niche, lista.city].filter(Boolean).join(' · ')
  const meta = lista.targetContacts
  const progresso = meta ? Math.min(1, lista.contacted / meta) : null

  return (
    <article className={cn('flex flex-col gap-4 rounded-xl border border-border bg-card p-5', lista.archived && 'opacity-60')}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-base font-extrabold text-foreground">{lista.name}</h3>
          <p className="m-0 mt-0.5 truncate text-[13px] font-medium text-muted-foreground">{lista.archived ? 'Arquivada' : detalhe || 'Sem nicho definido'}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Ações da lista ${lista.name}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEditar}>
              <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Editar
            </DropdownMenuItem>
            {!lista.archived && (
              <DropdownMenuItem onSelect={onImportar}>
                <FileUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Importar planilha nesta lista
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onArquivar(!lista.archived)}>
              {lista.archived ? <ArchiveRestore aria-hidden className="h-4 w-4" strokeWidth={1.75} /> : <Archive aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
              {lista.archived ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <dl className="m-0 grid grid-cols-4 gap-2">
        <Numero rotulo="Leads" valor={lista.leadCount} />
        <Numero rotulo="Contatados" valor={lista.contacted} />
        <Numero rotulo="Responderam" valor={lista.replied} detalhe={porcento(lista.replied, lista.contacted)} />
        <Numero rotulo="Fechados" valor={lista.won} cor={lista.won > 0 ? 'text-success-foreground' : undefined} />
      </dl>

      {progresso !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={lista.contacted} aria-valuemin={0} aria-valuemax={meta ?? 0} aria-label="Contatos da meta">
            <div className="h-full rounded-full bg-flow" style={{ width: `${progresso * 100}%` }} />
          </div>
          <p className="m-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {lista.contacted} de {meta} contatos da meta
          </p>
        </div>
      )}

      {lista.alert && regra && (
        <p className="m-0 flex items-start gap-2 rounded-lg bg-warn-foreground/10 px-3 py-2 text-[13px] font-medium text-warn-foreground">
          <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
          {lista.contacted} contatados e {lista.replied === 1 ? 'só 1 resposta' : `${lista.replied} respostas`} (a regra pede {regra.respostas} a cada {regra.contatos}). Troque o
          nicho ou a mensagem.
        </p>
      )}
    </article>
  )
}

function Numero({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: number; detalhe?: string; cor?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs font-semibold text-muted-foreground">{rotulo}</dt>
      <dd className={cn('m-0 text-xl font-extrabold tabular-nums text-foreground', cor)}>
        {valor}
        {detalhe && <span className="ml-1 text-xs font-semibold text-muted-foreground">{detalhe}</span>}
      </dd>
    </div>
  )
}
