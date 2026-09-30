import { formatCurrency, formatElapsed } from '../../../lib/format.ts'
import type { LeadWithStage } from '../types.ts'
import { LeadAvatar } from './LeadAvatar.tsx'
import { SourceIcon } from './SourceIcon.tsx'
import { WhatsAppLink } from './WhatsAppLink.tsx'

export interface StageInfo {
  label: string
  colorClass: string
  /** Etapa final do funil: valor em verde */
  closed: boolean
}

const empty = <span className="text-slate-400">—</span>

// Tabela de leads (BRAND.md, seção 8 · "Tabela"): superfície Navy 750, cabeçalho 13/600 Slate 400,
// linhas com divisória Navy 700 e hover Navy 800. Mesmo vocabulário do card do Kanban: iniciais,
// ícone de origem, valores em Manrope (verde na etapa final). WhatsApp na linha, visível no hover.
// No celular vira lista com as mesmas informações.
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
            <th scope="col" className="px-3 text-right font-semibold">Atualizado</th>
            <th scope="col" className="w-14 pr-4">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const stage = stageInfo(lead.stageId, lead.stage.name)
            return (
              <tr
                key={lead.id}
                onClick={() => onOpen(lead)}
                className="group cursor-pointer border-b transition-colors last:border-b-0 hover:bg-navy-800"
              >
                <td className="h-15 max-w-72 px-5">
                  <span className="flex min-w-0 items-center gap-3">
                    <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
                    {/* Botão dá acesso pelo teclado; a linha inteira também abre com clique */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(lead)
                      }}
                      className="block min-w-0 cursor-pointer truncate rounded-xs text-left text-ui font-bold text-white"
                    >
                      {lead.name}
                    </button>
                  </span>
                </td>
                <td className="max-w-56 px-3">
                  {lead.phone || lead.email ? (
                    <span className="flex flex-col">
                      <span className="truncate text-small font-medium text-slate-300">{lead.phone ?? lead.email}</span>
                      {lead.phone && lead.email && (
                        <span className="truncate text-xs font-semibold text-slate-400">{lead.email}</span>
                      )}
                    </span>
                  ) : (
                    empty
                  )}
                </td>
                <td className="px-3">
                  {lead.source ? (
                    <span className="flex items-center gap-2 text-small text-slate-300">
                      <SourceIcon source={lead.source} size={16} />
                      <span className="truncate">{lead.source}</span>
                    </span>
                  ) : (
                    empty
                  )}
                </td>
                <td className="px-3">
                  <span className="flex items-center gap-2 text-small text-slate-300">
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${stage.colorClass}`} />
                    <span className="truncate">{stage.label}</span>
                  </span>
                </td>
                <td
                  className={`px-3 text-right text-ui font-bold whitespace-nowrap tabular-nums ${
                    stage.closed ? 'text-success' : 'text-white'
                  }`}
                >
                  {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : empty}
                </td>
                <td className="px-3 text-right text-xs font-semibold whitespace-nowrap text-slate-400">
                  <time dateTime={lead.updatedAt}>{formatElapsed(lead.updatedAt)}</time>
                </td>
                <td className="pr-4">
                  <WhatsAppLink
                    name={lead.name}
                    phone={lead.phone}
                    className="ml-auto opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                  />
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
            <li key={lead.id} className="flex items-start gap-1 pr-3 transition-colors hover:bg-navy-800">
              <button
                type="button"
                onClick={() => onOpen(lead)}
                className="flex min-w-0 flex-1 cursor-pointer gap-3 py-3.5 pl-4 text-left"
              >
                <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
                <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                  <span className="truncate text-ui font-bold text-white">{lead.name}</span>
                  <span className={`text-ui font-bold tabular-nums ${stage.closed ? 'text-success' : 'text-white'}`}>
                    {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : empty}
                  </span>
                  <span className="truncate text-small font-medium text-slate-400">{lead.phone ?? lead.email ?? ''}</span>
                  <span className="text-right text-xs font-semibold text-slate-400">{formatElapsed(lead.updatedAt)}</span>
                  <span className="col-span-2 mt-1 flex items-center gap-3 text-small text-slate-300">
                    {lead.source && (
                      <span className="flex items-center gap-1.5">
                        <SourceIcon source={lead.source} />
                        {lead.source}
                      </span>
                    )}
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className={`size-2 shrink-0 rounded-full ${stage.colorClass}`} />
                      <span className="truncate">{stage.label}</span>
                    </span>
                  </span>
                </span>
              </button>
              <WhatsAppLink name={lead.name} phone={lead.phone} reserveSpace className="mt-3" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
