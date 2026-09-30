import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '../../../../components/ui/Button.tsx'

// Fim da importação: quantos entraram e quantos ficaram de fora, com atalhos para o funil e para a
// lista de leads filtrada pela origem "Planilha".
export function DoneStep({ created, skipped, onAgain }: { created: number; skipped: number; onAgain: () => void }) {
  return (
    <section className="flex flex-col items-start gap-5 rounded-xl border bg-navy-800 p-6">
      <span className="grid size-12 place-items-center rounded-full bg-slate-tint text-success">
        <CircleCheck aria-hidden size={24} strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="text-h2">
          {created} lead{created === 1 ? ' importado' : 's importados'}
        </h2>
        <p className="mt-1 text-body text-slate-400">
          {skipped > 0
            ? `${skipped} linha${skipped === 1 ? ' ficou' : 's ficaram'} de fora (já no CRM, com problema ou desmarcada${skipped === 1 ? '' : 's'}).`
            : 'Todas as linhas da planilha entraram.'}{' '}
          Eles estão no funil com origem "Planilha".
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/kanban"
          className="inline-flex h-11 items-center rounded-md bg-violet-600 px-5 text-ui font-bold text-on-accent"
        >
          Ver no funil
        </Link>
        <Link
          to="/leads?origem=Planilha"
          className="inline-flex h-11 items-center rounded-md border border-navy-600 px-5 text-ui font-bold text-white transition-colors hover:bg-navy-750"
        >
          Ver leads importados
        </Link>
        <Button variant="secondary" onClick={onAgain}>
          Importar outra planilha
        </Button>
      </div>
    </section>
  )
}
