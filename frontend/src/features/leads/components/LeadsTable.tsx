import { formatCurrency, formatElapsed } from '../../../lib/format.ts'
import type { LeadWithStage } from '../types.ts'
import { SourceTag } from './SourceTag.tsx'

export interface StageInfo {
  label: string
  colorClass: string
}

// Tabela de leads (BRAND.md, seção 8 · "Tabela"): superfície Navy 750, cabeçalho 13/600 Slate 400,
// linhas com divisória Navy 700 e hover Navy 800. Valores em Geist Mono, alinhados à direita.
// No celular vira lista de cartões com as mesmas informações.
export function LeadsTable({
  leads,
  stageInfo,
  onOpen,
}: {
  leads: LeadWithStage[]
  stageInfo: (stageId: string, fallbackName: string) => StageInfo
  onOpen: (lead: LeadWithStage) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-navy-750">
      <table className="hidden w-full text-left md:table">
        <thead>
          <tr className="border-b text-small text-slate-400">
            <th scope="col" className="h-10 px-5 font-semibold">Nome</th>
            <th scope="col" className="px-3 font-semibold">Contato</th>
            <th scope="col" className="px-3 font-semibold">Origem</th>
            <th scope="col" className="px-3 font-semibold">Etapa</th>
            <th scope="col" className="px-3 text-right font-semibold">Valor</th>
            <th scope="col" className="px-5 text-right font-semibold">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const stage = stageInfo(lead.stageId, lead.stage.name)
            return (
              <tr
                key={lead.id}
                onClick={() => onOpen(lead)}
                className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-navy-800"
              >
                <td className="h-13 max-w-64 px-5">
                  {/* Botão dá acesso pelo teclado; a linha inteira também abre com clique */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpen(lead)
                    }}
                    className="block max-w-full cursor-pointer truncate rounded-xs text-left text-ui font-bold text-white"
                  >
                    {lead.name}
                  </button>
                </td>
                <td className="max-w-56 truncate px-3 text-small font-medium text-slate-300">
                  {lead.phone ?? lead.email ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3">
                  {lead.source ? <SourceTag source={lead.source} /> : <span className="text-small text-slate-400">—</span>}
                </td>
                <td className="px-3">
                  <span className="flex items-center gap-2 text-small text-slate-300">
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${stage.colorClass}`} />
                    <span className="truncate">{stage.label}</span>
                  </span>
                </td>
                <td className="px-3 text-right font-mono text-data whitespace-nowrap">
                  {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 text-right text-xs font-semibold whitespace-nowrap text-slate-400">
                  <time dateTime={lead.updatedAt}>{formatElapsed(lead.updatedAt)}</time>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-navy-700 md:hidden">
        {leads.map((lead) => {
          const stage = stageInfo(lead.stageId, lead.stage.name)
          return (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => onOpen(lead)}
                className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-navy-800"
              >
                <span className="truncate text-ui font-bold text-white">{lead.name}</span>
                <span className="font-mono text-xs text-white">
                  {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : <span className="text-slate-400">—</span>}
                </span>
                <span className="truncate text-small font-medium text-slate-400">{lead.phone ?? lead.email ?? ''}</span>
                <span className="text-right text-xs font-semibold text-slate-400">{formatElapsed(lead.updatedAt)}</span>
                <span className="col-span-2 mt-1.5 flex items-center gap-3">
                  {lead.source && <SourceTag source={lead.source} />}
                  <span className="flex min-w-0 items-center gap-2 text-small text-slate-300">
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${stage.colorClass}`} />
                    <span className="truncate">{stage.label}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
