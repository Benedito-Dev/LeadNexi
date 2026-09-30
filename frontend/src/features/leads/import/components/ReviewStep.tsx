import { CircleAlert, CircleCheck, Copy, FileText, LoaderCircle, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../../components/ui/Button.tsx'
import { useStageOptions } from '../../../pipelines/useStageOptions.ts'
import type { ImportLeadsResult } from '../../api.ts'
import { useImportLeads } from '../../hooks.ts'
import type { ColumnsChoice, ImportRow } from './ColumnsStep.tsx'

type RowCheck = ImportLeadsResult['rows'][number]

// Passo 3: o servidor confere as linhas sem gravar (dryRun) e a tabela mostra o que acontece com
// cada uma: entra, já está no CRM, repetida na planilha ou com problema. Só as marcadas são
// importadas; linha que parece instrução ("Como usar:") começa desmarcada.
export function ReviewStep({
  choice,
  onBack,
  onDone,
}: {
  choice: ColumnsChoice
  onBack: () => void
  onDone: (created: number, skipped: number) => void
}) {
  const check = useImportLeads()
  const run = useImportLeads()
  const { stageInfo } = useStageOptions()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const { rows } = choice
  const { mutate: runCheck } = check

  useEffect(() => {
    runCheck(
      { leads: rows.map((row) => row.lead), dryRun: true },
      {
        onSuccess: (result) =>
          setSelected(
            new Set(result.rows.filter((row) => row.status === 'ready' && !rows[row.index].note).map((row) => row.index)),
          ),
      },
    )
  }, [rows, runCheck])

  if (check.isPending || check.isIdle) {
    return (
      <p className="flex items-center gap-2 py-10 text-body text-slate-400">
        <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
        Conferindo {rows.length} linhas com o CRM…
      </p>
    )
  }
  if (check.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-body text-slate-400">Não foi possível conferir a planilha.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={() => runCheck({ leads: rows.map((row) => row.lead), dryRun: true })}>Tentar de novo</Button>
        </div>
      </div>
    )
  }

  const checks = check.data.rows
  const ready = checks.filter((row) => row.status === 'ready' && !rows[row.index].note).length
  const notes = checks.filter((row) => row.status === 'ready' && rows[row.index].note).length
  const duplicates = checks.filter((row) => row.status === 'duplicate').length
  const invalid = checks.filter((row) => row.status === 'invalid').length

  function toggle(index: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function importSelected() {
    const chosen = [...selected].sort((a, b) => a - b).map((index) => rows[index].lead)
    run.mutate(
      { leads: chosen, dryRun: false },
      { onSuccess: (result) => onDone(result.accepted, rows.length - result.accepted) },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <CircleCheck aria-hidden size={16} strokeWidth={1.75} className="text-success" />
          <span className="tabular-nums">{ready}</span> pronta{ready === 1 ? '' : 's'} para entrar
        </span>
        {duplicates > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Copy aria-hidden size={16} strokeWidth={1.75} className="text-warning" />
            <span className="tabular-nums">{duplicates}</span> já no CRM ou repetida{duplicates === 1 ? '' : 's'}
          </span>
        )}
        {notes > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <FileText aria-hidden size={16} strokeWidth={1.75} className="text-slate-400" />
            <span className="tabular-nums">{notes}</span> parece{notes === 1 ? '' : 'm'} instrução (desmarcada
            {notes === 1 ? '' : 's'})
          </span>
        )}
        {invalid > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="text-danger" />
            <span className="tabular-nums">{invalid}</span> com problema
          </span>
        )}
      </p>

      <ul aria-label="Linhas da planilha" className="flex flex-col rounded-xl border bg-navy-800">
        {rows.map((row, index) => (
          <ReviewRow
            key={row.line}
            row={row}
            check={checks[index]}
            checked={selected.has(index)}
            onToggle={() => toggle(index)}
            stage={stageInfo(row.lead.stageId, '')}
          />
        ))}
      </ul>

      <footer className="flex flex-col gap-3 border-t pt-5">
        {run.isError && (
          <p role="alert" className="flex items-start gap-2 text-small text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
            Não foi possível importar. Nada foi gravado; tente de novo.
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="secondary" onClick={onBack} disabled={run.isPending}>
            Voltar às colunas
          </Button>
          <Button onClick={importSelected} disabled={selected.size === 0 || run.isPending}>
            {run.isPending ? (
              <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Upload aria-hidden size={18} strokeWidth={1.75} />
            )}
            Importar {selected.size} lead{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function ReviewRow({
  row,
  check,
  checked,
  onToggle,
  stage,
}: {
  row: ImportRow
  check: RowCheck | undefined
  checked: boolean
  onToggle: () => void
  stage: { label: string; colorClass: string }
}) {
  const ready = check?.status === 'ready'
  const contact = [
    row.lead.instagramUsername && `@${row.lead.instagramUsername.replace(/^@/, '')}`,
    row.lead.phone,
    row.lead.email,
  ]
    .filter(Boolean)
    .join(' · ')
  const id = `import-row-${row.line}`

  return (
    <li
      className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[auto_56px_minmax(0,1fr)_200px_minmax(0,220px)] sm:items-center sm:gap-4 ${
        checked ? '' : 'opacity-70'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={!ready}
        onChange={onToggle}
        aria-label={`Importar ${row.lead.name || `linha ${row.line}`}`}
        className="mt-0.5 size-4 cursor-pointer accent-violet-600 disabled:cursor-not-allowed sm:mt-0"
      />
      <span className="hidden text-small text-slate-400 tabular-nums sm:block">Linha {row.line}</span>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className={`block truncate text-ui font-bold ${row.lead.name ? 'text-white' : 'text-slate-400'}`}>
          {row.lead.name || 'Sem nome'}
        </span>
        {(contact || row.lead.notes) && (
          <span className="flex min-w-0 items-center gap-1.5 text-small text-slate-400">
            {contact && <span className="truncate">{contact}</span>}
            {row.lead.notes && (
              <span title={row.lead.notes} className="inline-flex shrink-0 items-center gap-1">
                <FileText aria-hidden size={13} strokeWidth={1.75} />
                observações
              </span>
            )}
          </span>
        )}
      </label>
      <span className="col-start-2 flex min-w-0 items-center gap-1.5 text-small text-slate-300 sm:col-start-auto">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${stage.colorClass}`} />
        <span className="truncate">{stage.label}</span>
      </span>
      <span className="col-start-2 sm:col-start-auto">
        <RowStatus check={check} note={row.note} />
      </span>
    </li>
  )
}

function RowStatus({ check, note }: { check: RowCheck | undefined; note: boolean }) {
  if (!check) return null
  if (check.status === 'ready') {
    return note ? (
      <span className="text-small text-slate-400">Parece instrução, não lead</span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-small font-bold text-success">
        <CircleCheck aria-hidden size={14} strokeWidth={1.75} />
        Entra
      </span>
    )
  }
  const duplicate = check.status === 'duplicate'
  return (
    <span className={`flex items-start gap-1.5 text-small ${duplicate ? 'text-warning' : 'text-danger'}`}>
      {duplicate ? (
        <Copy aria-hidden size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      ) : (
        <CircleAlert aria-hidden size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      )}
      {check.reason}
    </span>
  )
}
