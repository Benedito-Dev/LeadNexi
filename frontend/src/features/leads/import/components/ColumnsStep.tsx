import { ArrowRight, CircleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../../../components/ui/Button.tsx'
import { Dropdown } from '../../../../components/ui/Dropdown.tsx'
import { useStageOptions } from '../../../pipelines/useStageOptions.ts'
import type { ImportLeadRow } from '../../api.ts'
import {
  distinctStatuses,
  guessStage,
  guessTargets,
  IMPORT_LIMIT,
  looksLikeNote,
  mapRow,
  SINGLE_TARGETS,
  TARGET_LABELS,
  type ColumnTarget,
} from '../mapping.ts'
import { mainSheet, type Sheet } from '../spreadsheet.ts'

/** Linha pronta para conferir e enviar */
export interface ImportRow {
  /** Linha na planilha */
  line: number
  lead: ImportLeadRow
  /** Parece instrução, não lead (ex.: "Como usar:"): começa desmarcada */
  note: boolean
}

/** O que foi escolhido neste passo (volta preenchido se o usuário voltar da conferência) */
export interface ColumnsChoice {
  sheetName: string
  targets: ColumnTarget[]
  statusStage: Record<string, string>
  defaultStageId: string
  rows: ImportRow[]
}

const TARGET_OPTIONS = (Object.keys(TARGET_LABELS) as ColumnTarget[]).map((value) => ({
  value,
  label: TARGET_LABELS[value],
}))

// Passo 2: a aba, o destino de cada coluna (reconhecido pelo nome, ajustável) e a etapa de cada
// status da planilha. Colunas sem campo próprio entram nas observações ("Bairro: Messejana").
export function ColumnsStep({
  fileName,
  sheets,
  initial,
  onBack,
  onNext,
}: {
  fileName: string
  sheets: Sheet[]
  initial: ColumnsChoice | null
  onBack: () => void
  onNext: (choice: ColumnsChoice) => void
}) {
  const { stageOptions } = useStageOptions()
  const [sheetName, setSheetName] = useState(initial?.sheetName ?? mainSheet(sheets)?.name ?? '')
  const sheet = sheets.find((item) => item.name === sheetName) ?? sheets[0]
  const [targets, setTargets] = useState<ColumnTarget[]>(initial?.targets ?? guessTargets(sheet.headers))
  const [statusStage, setStatusStage] = useState<Record<string, string>>(initial?.statusStage ?? {})
  const [defaultStageId, setDefaultStageId] = useState(initial?.defaultStageId ?? '')

  const mapped = useMemo(() => sheet.rows.map((row) => mapRow(sheet, targets, row)), [sheet, targets])
  const statuses = useMemo(() => distinctStatuses(mapped), [mapped])
  const hasStatus = targets.includes('status')
  const firstStage = stageOptions[0]?.id ?? ''
  const fallbackStage = defaultStageId || firstStage
  const stageFor = (status: string) =>
    status ? (statusStage[status] ?? guessStage(status, stageOptions)) : fallbackStage

  function changeSheet(name: string) {
    const next = sheets.find((item) => item.name === name)
    if (!next) return
    setSheetName(name)
    setTargets(guessTargets(next.headers))
    setStatusStage({})
  }

  /** Campo de uma coluna só: quem já tinha esse campo volta para as observações */
  function changeTarget(index: number, target: ColumnTarget) {
    setTargets((current) =>
      current.map((value, at) =>
        at === index ? target : SINGLE_TARGETS.includes(target) && value === target ? 'extra' : value,
      ),
    )
  }

  const missingName = !targets.includes('name')
  const tooMany = sheet.rows.length > IMPORT_LIMIT

  function next() {
    if (missingName || tooMany || !fallbackStage) return
    onNext({
      sheetName,
      targets,
      statusStage: Object.fromEntries(statuses.map((status) => [status, stageFor(status)])),
      defaultStageId: fallbackStage,
      rows: mapped.map((lead, index) => ({
        line: lead.line,
        note: looksLikeNote(sheet.rows[index].cells),
        lead: {
          name: lead.name,
          ...(lead.phone && { phone: lead.phone }),
          ...(lead.email && { email: lead.email }),
          ...(lead.instagramUsername && { instagramUsername: lead.instagramUsername }),
          ...(lead.estimatedValue !== undefined && { estimatedValue: lead.estimatedValue }),
          ...(lead.notes && { notes: lead.notes }),
          stageId: stageFor(lead.status),
        },
      })),
    })
  }

  const stageDropdownOptions = stageOptions.map((option) => ({
    value: option.id,
    label: option.label,
    icon: <span aria-hidden className={`size-2 shrink-0 rounded-full ${option.colorClass}`} />,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-navy-800 px-4 py-3">
        <p className="min-w-0 text-small text-slate-300">
          <span className="font-bold text-white">{fileName}</span> ·{' '}
          <span className="tabular-nums">{sheet.rows.length}</span> linha{sheet.rows.length === 1 ? '' : 's'}
        </p>
        {sheets.length > 1 && (
          <div className="w-full sm:w-56">
            <Dropdown
              label="Aba da planilha"
              value={sheetName}
              onChange={changeSheet}
              options={sheets.map((item) => ({ value: item.name, label: `Aba "${item.name}"` }))}
            />
          </div>
        )}
      </div>

      <section aria-labelledby="columns-title" className="flex flex-col gap-3">
        <div>
          <h2 id="columns-title" className="text-h2">
            Colunas
          </h2>
          <p className="mt-1 text-small text-slate-400">
            Reconheci as colunas pelo nome. O que não tem campo próprio vai para as observações do lead.
          </p>
        </div>
        <ul className="flex flex-col rounded-xl border bg-navy-800">
          {sheet.headers.map((header, index) => {
            const sample = sheet.rows.find((row) => row.cells[index]?.text)?.cells[index]
            return (
              <li
                key={`${header}-${index}`}
                className="grid gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_240px] sm:items-center sm:gap-4"
              >
                <p className="truncate text-ui font-bold text-white">{header}</p>
                <p className="truncate text-small text-slate-400" title={sample?.link ?? sample?.text}>
                  {sample ? (sample.link ? `${sample.text} (link)` : sample.text) : 'vazia'}
                </p>
                <Dropdown
                  label={`Destino da coluna ${header}`}
                  value={targets[index]}
                  onChange={(value) => changeTarget(index, value as ColumnTarget)}
                  options={TARGET_OPTIONS}
                />
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="stages-title" className="flex flex-col gap-3">
        <div>
          <h2 id="stages-title" className="text-h2">
            Etapas
          </h2>
          <p className="mt-1 text-small text-slate-400">
            {hasStatus
              ? 'Cada status da planilha vira uma etapa do funil.'
              : 'Sem coluna de status: todos os leads entram na mesma etapa.'}
          </p>
        </div>
        <ul className="flex flex-col rounded-xl border bg-navy-800">
          {hasStatus &&
            statuses.map((status) => (
              <li
                key={status}
                className="grid gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:gap-4"
              >
                <p className="text-ui text-white">
                  {status}{' '}
                  <span className="text-small text-slate-400 tabular-nums">
                    · {mapped.filter((lead) => lead.status === status).length}
                  </span>
                </p>
                <Dropdown
                  label={`Etapa para o status ${status}`}
                  value={stageFor(status)}
                  onChange={(value) => setStatusStage((current) => ({ ...current, [status]: value }))}
                  options={stageDropdownOptions}
                />
              </li>
            ))}
          <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:gap-4">
            <p className="text-ui text-white">{hasStatus ? 'Sem status' : 'Etapa dos leads'}</p>
            <Dropdown
              label={hasStatus ? 'Etapa para quem não tem status' : 'Etapa dos leads'}
              value={fallbackStage}
              onChange={setDefaultStageId}
              options={stageDropdownOptions}
            />
          </li>
        </ul>
      </section>

      <footer className="flex flex-col gap-3 border-t pt-5">
        {(missingName || tooMany) && (
          <p role="alert" className="flex items-start gap-2 text-small text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
            {missingName
              ? 'Escolha qual coluna é o nome do lead.'
              : `A planilha tem ${sheet.rows.length.toLocaleString('pt-BR')} linhas. Importe até ${IMPORT_LIMIT.toLocaleString('pt-BR')} por vez.`}
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="secondary" onClick={onBack}>
            Trocar arquivo
          </Button>
          <Button onClick={next} disabled={missingName || tooMany || !fallbackStage}>
            Conferir {sheet.rows.length} linha{sheet.rows.length === 1 ? '' : 's'}
            <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
          </Button>
        </div>
      </footer>
    </div>
  )
}
