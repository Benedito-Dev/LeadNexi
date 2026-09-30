import { CircleAlert, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { IMPORT_LIMIT } from '../mapping.ts'
import { readSpreadsheet, SPREADSHEET_ACCEPT, type Sheet } from '../spreadsheet.ts'

// Passo 1: arrastar ou escolher a planilha. Ela é lida aqui mesmo, no navegador.
export function FileStep({ onRead }: { onRead: (fileName: string, sheets: Sheet[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(file: File | undefined) {
    if (!file) return
    setError(null)
    setReading(true)
    try {
      const sheets = await readSpreadsheet(file)
      if (sheets.every((sheet) => sheet.rows.length === 0)) {
        setError('Não achei linhas nessa planilha. Confira se a primeira linha tem os nomes das colunas.')
        return
      }
      onRead(file.name, sheets)
    } catch {
      setError('Não consegui ler esse arquivo. Use uma planilha .xlsx, .xls, .ods ou .csv.')
    } finally {
      setReading(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    void open(event.dataTransfer.files[0])
  }

  return (
    <section aria-label="Escolher planilha" className="flex flex-col gap-3">
      <label
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center transition-colors hover:border-navy-600 hover:bg-navy-800 ${
          dragging ? 'border-violet bg-navy-800' : ''
        }`}
      >
        {reading ? (
          <LoaderCircle aria-hidden size={28} strokeWidth={1.75} className="animate-spin text-slate-400" />
        ) : (
          <FileSpreadsheet aria-hidden size={28} strokeWidth={1.75} className="text-slate-400" />
        )}
        <span className="text-ui font-bold text-white">
          {reading ? 'Lendo a planilha…' : 'Arraste a planilha aqui ou clique para escolher'}
        </span>
        <span className="text-small text-slate-400">
          .xlsx, .xls, .ods ou .csv · a primeira linha com os nomes das colunas · até{' '}
          {IMPORT_LIMIT.toLocaleString('pt-BR')} leads por vez
        </span>
        <input
          type="file"
          accept={SPREADSHEET_ACCEPT}
          className="sr-only"
          disabled={reading}
          onChange={(event) => {
            void open(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-small text-danger">
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
          {error}
        </p>
      )}
      <p className="text-small text-slate-400">
        O arquivo é lido no seu navegador: só as linhas que você confirmar vão para o LeadNexi.
      </p>
    </section>
  )
}
