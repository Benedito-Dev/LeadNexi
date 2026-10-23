import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Bell,
  CalendarClock,
  CircleCheck,
  CircleSlash,
  Clock,
  Hourglass,
  MessageCircleReply,
  Send,
  type LucideIcon,
} from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { formatCurrency } from '../../../lib/format.ts'
import { ConversationButton } from '../../conversations/components/ConversationButton.tsx'
import { LeadAvatar } from '../../leads/components/LeadAvatar.tsx'
import { SourceIcon } from '../../leads/components/SourceIcon.tsx'
import { WhatsAppCadenceAction } from '../../leads/components/WhatsAppCadenceAction.tsx'
import type { Lead } from '../../leads/types.ts'
import { cardActions } from '../cardActions.ts'
import { isActionable, nextAction, type NextAction, type NextActionIcon, type NextActionTone } from '../nextAction.ts'
import type { Stage } from '../types.ts'

// Card de lead (BRAND.md, seção 8): corpo com iniciais, nome e origem (com ícone do canal); rodapé separado por
// divisória com o PRÓXIMO PASSO à esquerda (o que fazer agora, colorido pela urgência) e o valor à direita,
// só quando existe (verde na etapa final). Lead quente (respondeu) ou atrasado ganha a borda na cor do tom.
// `actions`: quantos botões (WhatsApp, conversa do direct) o SortableLeadCard sobrepõe no canto direito
// do corpo; o nome deixa o espaço deles livre. `landed`: acabou de avançar de etapa (brilho uma vez).
export function LeadCard({
  lead,
  stageType,
  dragging = false,
  landed = false,
  actions = 0,
}: {
  lead: Lead
  stageType: Stage['stageType']
  dragging?: boolean
  landed?: boolean
  actions?: number
}) {
  const action = dragging ? null : nextAction(lead, stageType)
  const closed = stageType === 'WON'
  const border = dragging
    ? 'border-cyan'
    : action?.tone === 'hot'
      ? 'border-cyan/50'
      : action?.tone === 'overdue'
        ? 'border-danger/45'
        : ''

  return (
    <div
      className={`rounded-md border transition-colors ${border} ${
        dragging ? '-rotate-[1.5deg] bg-navy-drag shadow-drag' : 'bg-navy-800'
      } ${landed ? 'motion-safe:animate-card-land' : ''} ${stageType === 'LOST' ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-3">
        <LeadAvatar name={lead.name} avatarId={lead.avatarId} />
        <div className={`min-w-0 flex-1 ${actions === 2 ? 'pr-16' : actions === 1 ? 'pr-8' : ''}`}>
          <p className="line-clamp-2 text-ui font-bold text-white">{lead.name}</p>
          {lead.source && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <SourceIcon source={lead.source} />
              <span className="truncate">{lead.source}</span>
            </p>
          )}
          {lead.neighborhood && <p className="mt-1 truncate text-xs font-medium text-slate-400">{lead.neighborhood}</p>}
          {(lead.adStatus === 'anuncia' || lead.phoneType === 'fixo' || lead.isNetwork) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lead.adStatus === 'anuncia' && <CardTag tone="violet">Anuncia</CardTag>}
              {lead.phoneType === 'fixo' && <CardTag tone="slate">Fixo</CardTag>}
              {lead.isNetwork && <CardTag tone="cyan">Rede</CardTag>}
            </div>
          )}
        </div>
      </div>

      {(action || lead.estimatedValue || dragging) && (
        <div className="flex items-center justify-between gap-2 border-t px-3.5 py-2.5">
          {dragging ? (
            <span className="text-xs font-bold text-cyan">Solte na próxima etapa</span>
          ) : (
            action && <NextStep action={action} />
          )}
          {lead.estimatedValue && (
            <span className={`ml-auto shrink-0 text-ui font-bold tabular-nums ${closed ? 'text-success' : 'text-white'}`}>
              {formatCurrency(lead.estimatedValue)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function CardTag({ children, tone }: { children: string; tone: 'violet' | 'cyan' | 'slate' }) {
  const classes = {
    violet: 'bg-violet-tint text-violet-300',
    cyan: 'bg-cyan-tint text-cyan',
    slate: 'bg-slate-tint text-slate-300',
  } as const
  return <span className={`rounded-full px-2 py-0.5 text-[10px] leading-none font-bold ${classes[tone]}`}>{children}</span>
}

const ACTION_TONE: Record<NextActionTone, string> = {
  hot: 'text-cyan',
  overdue: 'text-danger',
  today: 'text-warning',
  go: 'text-violet-300',
  scheduled: 'text-slate-300',
  done: 'text-success',
  idle: 'text-slate-400',
}

const ACTION_ICON: Record<NextActionIcon, LucideIcon> = {
  reply: MessageCircleReply,
  bell: Bell,
  send: Send,
  calendar: CalendarClock,
  wait: Hourglass,
  check: CircleCheck,
  clock: Clock,
  lost: CircleSlash,
}

/** Próximo passo no rodapé do card (BRAND.md, seção 8 · "Card de lead"): ícone 13 + texto 12/700 no tom da urgência. */
function NextStep({ action }: { action: NextAction }) {
  const Icon = ACTION_ICON[action.icon]
  const content = (
    <>
      {action.tone === 'hot' ? (
        <span aria-hidden className="relative flex size-2 shrink-0">
          <span className="absolute inset-0 rounded-full bg-cyan opacity-60 motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-cyan" />
        </span>
      ) : (
        <Icon aria-hidden size={13} strokeWidth={1.75} className="shrink-0" />
      )}
      <span className="sr-only">Próximo passo: </span>
      <span className="truncate">{action.label}</span>
    </>
  )
  const className = `flex min-w-0 items-center gap-1.5 text-xs font-bold ${ACTION_TONE[action.tone]}`
  return action.dateTime ? (
    <time dateTime={action.dateTime} title={action.title} className={className}>
      {content}
    </time>
  ) : (
    <span title={action.title} className={className}>
      {content}
    </span>
  )
}

/**
 * Card arrastável. Clique ou Enter abre a edição; Espaço pega o card para mover pelo teclado.
 * Com `disabled` (ex.: busca ativa) o card só abre, não arrasta.
 * Os botões de WhatsApp e da conversa do direct ficam FORA da área arrastável (irmãos, sobrepostos no
 * canto): assim não há elemento interativo dentro do card, e Enter/clique neles não abrem a edição nem
 * iniciam o arraste. O WhatsApp aparece no hover/foco do card no desktop (grupo nomeado `card`: a coluna
 * também é `group`) e sempre em toque, ou sempre quando o próximo passo é agora (1ª mensagem, follow-up
 * de hoje ou atrasado, resposta esperando): 1 toque do card ao WhatsApp. A conversa fica sempre à vista (a bolinha verde diz que dá para
 * responder agora).
 */
export function SortableLeadCard({
  lead,
  stageType,
  disabled = false,
  landed = false,
  onOpen,
}: {
  lead: Lead
  stageType: Stage['stageType']
  disabled?: boolean
  landed?: boolean
  onOpen: (lead: Lead) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead' },
    disabled,
  })

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && !isDragging) {
      event.preventDefault()
      onOpen(lead)
      return
    }
    listeners?.onKeyDown?.(event)
  }

  const actionable = isActionable(nextAction(lead, stageType))

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group/card relative ${isDragging ? 'opacity-40' : ''}`}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onKeyDown={handleKeyDown}
        onClick={() => onOpen(lead)}
        // Bloqueia o arraste nativo do navegador (foto, texto selecionado): no Chrome ele para os
        // eventos do mouse e o card não sai do lugar
        onDragStart={(event) => event.preventDefault()}
        aria-roledescription={disabled ? undefined : 'card arrastável'}
        aria-label={disabled ? `${lead.name}. Enter para editar.` : `${lead.name}. Enter para editar, Espaço para mover.`}
        className={`rounded-md transition-colors select-none hover:[&>div]:border-navy-600 ${
          disabled ? 'cursor-pointer' : 'cursor-grab'
        }`}
      >
        <LeadCard lead={lead} stageType={stageType} landed={landed} actions={cardActions(lead)} />
      </div>
      {!isDragging && cardActions(lead) > 0 && (
        <div className="absolute top-3 right-2.5 flex">
          <WhatsAppCadenceAction
            lead={lead}
            className={
              actionable
                ? ''
                : 'opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
            }
          />
          <ConversationButton lead={lead} />
        </div>
      )}
    </div>
  )
}
