import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Select } from '../components/ui/Field.tsx'
import { Input } from '../components/ui/Input.tsx'
import {
  LeadFormDialog,
  type LeadFormTarget,
  type StageOption,
} from '../features/leads/components/LeadFormDialog.tsx'
import { LeadsTable, type StageInfo } from '../features/leads/components/LeadsTable.tsx'
import { useLeads } from '../features/leads/hooks.ts'
import { LEAD_SOURCES } from '../features/leads/sources.ts'
import { usePipelines } from '../features/pipelines/hooks.ts'
import { stageColorClass } from '../features/pipelines/stageColor.ts'
import { useDebouncedValue } from '../lib/useDebouncedValue.ts'

const PAGE_SIZE = 20

export function LeadsPage() {
  // Filtros e página ficam na URL: sobrevivem ao recarregar e ao "voltar"
  const [params, setParams] = useSearchParams()
  const stageId = params.get('etapa') ?? ''
  const source = params.get('origem') ?? ''
  const page = Math.max(1, Number(params.get('pagina')) || 1)

  // A busca responde ao digitar, mas só consulta a API depois de uma pausa
  const [searchInput, setSearchInput] = useState(params.get('busca') ?? '')
  const search = useDebouncedValue(searchInput.trim())

  const [formTarget, setFormTarget] = useState<LeadFormTarget | null>(null)
  const pipelines = usePipelines()
  const leads = useLeads({ search, stageId, source, page, limit: PAGE_SIZE })

  const updateParams = useCallback(
    (changes: Record<string, string>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  // Só quando o termo (já com debounce) muda: vai para a URL e volta para a 1ª página.
  // Ao abrir a página com ?busca= e ?pagina=, nada é sobrescrito.
  const previousSearch = useRef(search)
  useEffect(() => {
    if (search === previousSearch.current) return
    previousSearch.current = search
    updateParams({ busca: search, pagina: '' })
  }, [search, updateParams])

  // Etapas de todos os funis: com mais de um funil, o rótulo leva o nome dele
  const allPipelines = pipelines.data ?? []
  const multiplePipelines = allPipelines.length > 1
  const stageOptions: StageOption[] = allPipelines.flatMap((pipeline) =>
    pipeline.stages.map((stage) => ({
      id: stage.id,
      label: multiplePipelines ? `${pipeline.name} · ${stage.name}` : stage.name,
    })),
  )
  const stageIndex = new Map(
    allPipelines.flatMap((pipeline) => pipeline.stages.map((stage, index) => [stage.id, index] as const)),
  )
  const stageLabel = new Map(stageOptions.map((option) => [option.id, option.label]))
  const stageInfo = (id: string, fallbackName: string): StageInfo => ({
    label: stageLabel.get(id) ?? fallbackName,
    colorClass: stageColorClass(stageIndex.get(id) ?? 0),
  })

  const hasFilters = search !== '' || stageId !== '' || source !== ''
  const meta = leads.data?.meta
  const firstStageId = stageOptions[0]?.id

  function clearFilters() {
    setSearchInput('')
    updateParams({ busca: '', etapa: '', origem: '', pagina: '' })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Leads"
        badge={
          meta && (
            <span className="rounded-full bg-slate-tint px-2.5 py-1 font-mono text-xs leading-none text-slate-300">
              {meta.total}
            </span>
          )
        }
        actions={
          <>
            <div className="min-w-0 flex-1 sm:w-60 sm:flex-none">
              <Input
                type="search"
                icon={Search}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar lead"
                aria-label="Buscar por nome, e-mail ou telefone"
              />
            </div>
            {firstStageId && (
              <Button onClick={() => setFormTarget({ mode: 'create', stageId: stageId || firstStageId })}>
                <Plus aria-hidden size={18} strokeWidth={1.75} />
                Novo lead
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 items-center gap-3 sm:flex">
        <div className="min-w-0 sm:w-56">
          <Select
            aria-label="Filtrar por etapa"
            value={stageId}
            onChange={(event) => updateParams({ etapa: event.target.value, pagina: '' })}
          >
            <option value="">Todas as etapas</option>
            {stageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 sm:w-48">
          <Select
            aria-label="Filtrar por origem"
            value={source}
            onChange={(event) => updateParams({ origem: event.target.value, pagina: '' })}
          >
            <option value="">Todas as origens</option>
            {LEAD_SOURCES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="col-span-2 h-11 cursor-pointer justify-self-start rounded-md px-3 text-ui text-slate-300 transition-colors hover:bg-navy-800"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {leads.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-slate-400">Não foi possível carregar os leads.</p>
          <Button variant="secondary" onClick={() => void leads.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : leads.isPending ? (
        <div aria-busy="true" aria-label="Carregando leads" className="overflow-hidden rounded-lg border bg-navy-750">
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="h-13 animate-pulse border-b last:border-b-0" />
          ))}
        </div>
      ) : leads.data.data.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed px-6 py-10">
          <p className="text-body text-slate-400">
            {hasFilters ? 'Nenhum lead encontrado com esses filtros.' : 'Nenhum lead ainda. Crie o primeiro para começar o funil.'}
          </p>
          {hasFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : (
            firstStageId && (
              <Button onClick={() => setFormTarget({ mode: 'create', stageId: firstStageId })}>
                <Plus aria-hidden size={18} strokeWidth={1.75} />
                Novo lead
              </Button>
            )
          )}
        </div>
      ) : (
        <>
          <div className={leads.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <LeadsTable
              leads={leads.data.data}
              stageInfo={stageInfo}
              onOpen={(lead) => setFormTarget({ mode: 'edit', lead })}
            />
          </div>
          {meta && meta.totalPages > 1 && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onChange={(next) => updateParams({ pagina: next === 1 ? '' : String(next) })}
            />
          )}
        </>
      )}

      <LeadFormDialog target={formTarget} stages={stageOptions} onClose={() => setFormTarget(null)} />
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onChange,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onChange: (page: number) => void
}) {
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const navButton =
    'grid size-11 cursor-pointer place-items-center rounded-md border border-navy-600 text-slate-300 transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4">
      <p className="text-small font-medium text-slate-400">
        <span className="font-mono text-slate-300">
          {from}–{to}
        </span>{' '}
        de <span className="font-mono text-slate-300">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)} className={navButton}>
          <ChevronLeft aria-hidden size={18} strokeWidth={1.75} />
        </button>
        <span className="px-2 font-mono text-xs text-slate-300" aria-current="page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={navButton}
        >
          <ChevronRight aria-hidden size={18} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  )
}
