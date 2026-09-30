import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { ColumnsStep, type ColumnsChoice } from '../features/leads/import/components/ColumnsStep.tsx'
import { DoneStep } from '../features/leads/import/components/DoneStep.tsx'
import { FileStep } from '../features/leads/import/components/FileStep.tsx'
import { ReviewStep } from '../features/leads/import/components/ReviewStep.tsx'
import type { Sheet } from '../features/leads/import/spreadsheet.ts'

type Step = 'file' | 'columns' | 'review' | 'done'

const STEPS: { value: Exclude<Step, 'done'>; label: string }[] = [
  { value: 'file', label: 'Arquivo' },
  { value: 'columns', label: 'Colunas' },
  { value: 'review', label: 'Conferir' },
]

// Importar leads de planilha (BRAND.md, seção 9.6): arquivo → colunas → conferir → pronto.
// A planilha é lida no navegador; só as linhas marcadas vão para o servidor, com origem "Planilha".
export function ImportLeadsPage() {
  const [step, setStep] = useState<Step>('file')
  const [file, setFile] = useState<{ name: string; sheets: Sheet[] } | null>(null)
  const [choice, setChoice] = useState<ColumnsChoice | null>(null)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          to="/leads"
          className="inline-flex w-fit items-center gap-1.5 text-small text-slate-400 transition-colors hover:text-slate-300"
        >
          <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
          Leads
        </Link>
        <PageHeader
          title="Importar planilha"
          description="Traga leads de uma planilha (.xlsx ou .csv). Quem já está no CRM fica de fora."
        />
      </div>

      {step !== 'done' && (
        <ol aria-label="Etapas da importação" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small">
          {STEPS.map((item, index) => {
            const current = item.value === step
            const done = STEPS.findIndex((other) => other.value === step) > index
            return (
              <li key={item.value} className="flex items-center gap-3">
                {index > 0 && <span aria-hidden className="h-px w-6 bg-navy-600" />}
                <span
                  aria-current={current ? 'step' : undefined}
                  className={`flex items-center gap-2 ${current ? 'font-bold text-white' : done ? 'text-slate-300' : 'text-slate-400'}`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs font-bold tabular-nums ${
                      current ? 'bg-violet-600 text-on-accent' : 'bg-slate-tint text-slate-300'
                    }`}
                  >
                    {index + 1}
                  </span>
                  {item.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {step === 'file' && (
        <FileStep
          onRead={(name, sheets) => {
            setFile({ name, sheets })
            setChoice(null)
            setStep('columns')
          }}
        />
      )}
      {step === 'columns' && file && (
        <ColumnsStep
          fileName={file.name}
          sheets={file.sheets}
          initial={choice}
          onBack={() => setStep('file')}
          onNext={(next) => {
            setChoice(next)
            setStep('review')
          }}
        />
      )}
      {step === 'review' && choice && (
        <ReviewStep
          choice={choice}
          onBack={() => setStep('columns')}
          onDone={(created, skipped) => {
            setResult({ created, skipped })
            setStep('done')
          }}
        />
      )}
      {step === 'done' && result && (
        <DoneStep
          created={result.created}
          skipped={result.skipped}
          onAgain={() => {
            setFile(null)
            setChoice(null)
            setResult(null)
            setStep('file')
          }}
        />
      )}
    </div>
  )
}
