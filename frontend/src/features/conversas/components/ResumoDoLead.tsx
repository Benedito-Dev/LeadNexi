import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CalendarClock, Check, FileText, History, MapPin, Phone, StickyNote, Tag, UserCheck, UserX, Wallet } from 'lucide-react'
import { InstagramIcon, WhatsAppLogo } from '@/brand/icons'
import { FotoRedonda } from '@/components/ui/foto-redonda'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { adicionarNota, agendarContato, atualizarLead, listarAtividades } from '../../crm/api'
import { formatarReais } from '../../crm/filtros'
import type { Atividade, Lead } from '../../crm/types'
import { formatarDecorrido, formatarDiaEHora, linkDoWhatsApp } from '../../hoje/textos'
import { fotoDoLead } from '../api'
import type { Conversa } from '../tipos'

/** O lead como a ficha precisa (os campos a mais que GET /leads/:id já devolve). */
export type LeadDoPainel = Lead & {
  stage: { id: string; name: string }
  neighborhood?: string | null
  cadenceStep?: number | null
}

/** Atividade do histórico com as etapas da mudança (o servidor já manda). */
type Evento = Atividade & { fromStage?: string | null; toStage?: string | null }

const PASSOS_DA_CADENCIA = ['1ª mensagem', 'Follow-up 1', 'Final']

/** Atalhos do próximo contato (às 10h). `null` = próxima segunda. */
const ATALHOS: [string, number | null][] = [
  ['Amanhã', 1],
  ['Em 3 dias', 3],
  ['Segunda', null],
]

/** Dia do atalho às 10h: daqui a `dias`, ou a próxima segunda (`null`). */
function dataDoAtalho(dias: number | null) {
  const data = new Date()
  if (dias === null) data.setDate(data.getDate() + ((8 - data.getDay()) % 7 || 7))
  else data.setDate(data.getDate() + dias)
  data.setHours(10, 0, 0, 0)
  return data
}

/** O que cada evento quer dizer, em uma linha. Mensagens do direct ficam fora: já estão na conversa. */
function descrever(e: Evento): string | null {
  switch (e.type) {
    case 'CREATED':
      return 'Entrou no funil'
    case 'STAGE_CHANGED':
      return e.toStage ? `Mudou para ${e.toStage}` : 'Mudou de etapa'
    case 'FOLLOW_UP_SCHEDULED':
      return e.dueAt ? `Contato agendado para ${formatarDiaEHora(e.dueAt).toLowerCase()}` : 'Contato agendado'
    case 'FOLLOW_UP_DONE':
      return 'Follow-up feito'
    case 'WHATSAPP_MESSAGE_SENT':
      return 'Mensagem no WhatsApp'
    case 'WHATSAPP_MESSAGE_RECEIVED':
      return 'Respondeu no WhatsApp'
    default:
      return null
  }
}

type Props = {
  conversa: Conversa
  lead: LeadDoPainel | null
  corDaEtapa: string
  onAbrirFicha: () => void
  /** "Não é lead" / "É lead" */
  onMudouLead: (archived: boolean) => void
  /** Agendou contato ou anotou: recarrega o lead */
  onMudou: () => void
  /** Conversa de demonstração (sem lead de verdade): só o contato aparece */
  demonstracao?: boolean
}

/**
 * Painel de trabalho do lead, ao lado da conversa: só o que a conversa não mostra (contato,
 * situação no funil, próximo contato, anotações e histórico) e atalhos para agir sem sair dela.
 */
export function ResumoDoLead({ conversa, lead, corDaEtapa, onAbrirFicha, onMudouLead, onMudou, demonstracao = false }: Props) {
  const [eventos, setEventos] = useState<{ leadId: string; lista: Evento[] } | null>(null)
  const [recarga, setRecarga] = useState(0)
  const [nota, setNota] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const historico = eventos && lead && eventos.leadId === lead.id ? eventos.lista : null

  useEffect(() => {
    if (!lead) return
    listarAtividades(lead.id)
      .then((lista) => setEventos({ leadId: lead.id, lista: lista as Evento[] }))
      .catch(() => undefined)
  }, [lead, recarga])

  const telefone = lead?.phone ?? conversa.telefone ?? null
  const linkWhats = telefone ? linkDoWhatsApp(telefone) : null
  const notas = (historico ?? []).filter((e) => e.type === 'NOTE' && e.text).slice(0, 3)
  const linhaDoTempo = (historico ?? []).map((e) => ({ e, texto: descrever(e) })).filter((x) => x.texto).slice(0, 5)
  const entrouNaEtapa = (historico ?? []).find((e) => e.type === 'STAGE_CHANGED')?.createdAt ?? lead?.createdAt
  const passo = lead?.cadenceStep ?? 0

  const agendar = async (dias: number | null) => {
    if (!lead) return
    const data = dataDoAtalho(dias)
    setOcupado(true)
    try {
      await agendarContato(lead.id, data.toISOString())
      addToast('success', 'Próximo contato agendado', formatarDiaEHora(data.toISOString()))
      onMudou()
      setRecarga((n) => n + 1)
    } catch {
      addToast('error', 'Não foi possível agendar', 'Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const anotar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!lead || !nota.trim()) return
    setOcupado(true)
    try {
      await adicionarNota(lead.id, nota.trim())
      setNota('')
      setRecarga((n) => n + 1)
    } catch {
      addToast('error', 'Não foi possível anotar', 'Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const alternarFunil = async () => {
    setOcupado(true)
    try {
      await atualizarLead(conversa.id, { archived: !conversa.archived })
      onMudouLead(!conversa.archived)
      addToast('success', conversa.archived ? 'Voltou para o funil' : 'Tirado do funil', conversa.name)
    } catch {
      addToast('error', 'Não foi possível mudar', 'Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {/* Perfil: capa em degradê e a foto por cima, com o que a conversa não diz (há quanto tempo é lead) */}
        <div className="border-b border-border pb-4">
          <div aria-hidden className="h-16 bg-gradient-to-r from-leadnexi-violet/30 via-leadnexi-violet/15 to-leadnexi-cyan/25" />
          <div className="-mt-9 flex flex-col items-center gap-1 px-4 text-center">
            <FotoRedonda src={fotoDoLead(conversa.avatarId)} nome={conversa.name} className="h-[72px] w-[72px] bg-leadnexi-violet/15 text-2xl text-leadnexi-violet-texto ring-4 ring-card" />
            <p className="m-0 mt-1 text-[15px] font-bold text-foreground">{conversa.name}</p>
            <p className="m-0 text-xs font-medium text-muted-foreground">
              {demonstracao
                ? 'Conversa de demonstração'
                : [lead?.createdAt ? `Lead há ${formatarDecorrido(lead.createdAt)}` : null, lead?.source ? `via ${lead.source}` : null].filter(Boolean).join(' · ') || ' '}
            </p>
          </div>
        </div>

        {/* Contato */}
        <Secao titulo="Contato">
          <Linha Icone={Phone} rotulo="Telefone">
            {telefone ? (
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{telefone}</span>
                {linkWhats && (
                  <a href={linkWhats} target="_blank" rel="noopener noreferrer" title="Abrir no WhatsApp" className="grid h-6 w-6 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground">
                    <WhatsAppLogo aria-hidden size={12} />
                  </a>
                )}
              </span>
            ) : (
              <Vazio>Sem telefone</Vazio>
            )}
          </Linha>
          {conversa.instagramUsername && (
            <Linha Icone={InstagramIcon} rotulo="Instagram">
              <a href={`https://www.instagram.com/${conversa.instagramUsername}/`} target="_blank" rel="noopener noreferrer" className="truncate text-leadnexi-cyan-texto no-underline hover:underline">
                @{conversa.instagramUsername}
              </a>
            </Linha>
          )}
          {!demonstracao && (
            <>
              <Linha Icone={Tag} rotulo="Origem">{lead?.source ?? <Vazio>Sem origem</Vazio>}</Linha>
              <Linha Icone={MapPin} rotulo="Bairro">{lead?.neighborhood ?? <Vazio>Sem bairro</Vazio>}</Linha>
              <Linha Icone={Wallet} rotulo="Valor">
                {lead?.estimatedValue ? <span className="font-bold tabular-nums text-success-foreground">{formatarReais(Number(lead.estimatedValue))}</span> : <Vazio>Sem valor</Vazio>}
              </Linha>
            </>
          )}
        </Secao>

        {demonstracao ? (
          <p className="m-0 px-4 py-4 text-xs font-medium text-muted-foreground">Demonstração do WhatsApp: o resto da ficha aparece quando o canal entrar de verdade.</p>
        ) : (
          <>
            {/* No funil */}
            <Secao titulo="No funil">
              <div className="flex items-center justify-between gap-2">
                {conversa.archived ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">Não é lead</span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold text-foreground"
                    style={{ backgroundColor: `color-mix(in srgb, ${corDaEtapa} 15%, transparent)`, borderColor: `color-mix(in srgb, ${corDaEtapa} 45%, transparent)` }}
                  >
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: corDaEtapa }} />
                    {lead?.stage.name ?? conversa.stageName}
                  </span>
                )}
                {entrouNaEtapa && <span className="text-[11px] font-semibold text-muted-foreground">há {formatarDecorrido(entrouNaEtapa)}</span>}
              </div>
              {/* Cadência: onde o lead está nas 3 mensagens */}
              <ol className="m-0 mt-3 flex items-center gap-1 p-0" aria-label={`Cadência: ${passo} de 3 mensagens`}>
                {PASSOS_DA_CADENCIA.map((rotulo, i) => {
                  const feito = passo > i
                  return (
                    <li key={rotulo} className="flex flex-1 list-none flex-col gap-1">
                      <span className={cn('h-1.5 rounded-full', feito ? 'bg-leadnexi-violet' : 'bg-muted')} />
                      <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold', feito ? 'text-foreground' : 'text-muted-foreground')}>
                        {feito && <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />}
                        {rotulo}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </Secao>

            {/* Próximo contato */}
            <Secao titulo="Próximo contato">
              <p className={cn('m-0 flex items-center gap-2 text-sm font-semibold', lead?.followUpAt ? 'text-foreground' : 'text-muted-foreground')}>
                <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                {lead?.followUpAt ? formatarDiaEHora(lead.followUpAt) : 'Nada agendado'}
              </p>
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {ATALHOS.map(([rotulo, dias]) => (
                  <button
                    key={rotulo}
                    type="button"
                    disabled={!lead || ocupado}
                    onClick={() => void agendar(dias)}
                    className="h-8 rounded-lg border border-border text-xs font-semibold text-foreground transition-colors hover:border-leadnexi-violet/50 hover:bg-leadnexi-violet/10 disabled:opacity-50"
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </Secao>

            {/* Anotações */}
            <Secao titulo="Anotações" Icone={StickyNote}>
              <form onSubmit={(e) => void anotar(e)}>
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  disabled={!lead || ocupado}
                  placeholder="Anotar algo… (Enter salva)"
                  aria-label="Nova anotação"
                  maxLength={2000}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-leadnexi-violet/60"
                />
              </form>
              {notas.length > 0 && (
                <ul className="m-0 mt-2.5 flex flex-col gap-2 p-0">
                  {notas.map((n) => (
                    <li key={n.id} className="list-none rounded-lg bg-muted/60 px-3 py-2">
                      <p className="m-0 line-clamp-3 whitespace-pre-wrap text-[13px] leading-5 text-foreground">{n.text}</p>
                      <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">há {formatarDecorrido(n.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>

            {/* Histórico (sem as mensagens do direct, que já estão na conversa) */}
            {linhaDoTempo.length > 0 && (
              <Secao titulo="Histórico" Icone={History}>
                <ol className="m-0 flex flex-col p-0">
                  {linhaDoTempo.map(({ e, texto }, i) => (
                    <li key={e.id} className="relative flex list-none gap-2.5 pb-3 last:pb-0">
                      {i < linhaDoTempo.length - 1 && <span aria-hidden className="absolute left-[3px] top-3 h-full w-px bg-border" />}
                      <span aria-hidden className="relative mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-leadnexi-violet/60" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-foreground">{texto}</span>
                        <span className="block text-[10px] font-semibold text-muted-foreground">há {formatarDecorrido(e.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Secao>
            )}
          </>
        )}
      </div>

      {/* Rodapé: a ficha completa e o "Não é lead" */}
      <div className="flex gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={onAbrirFicha}
          disabled={demonstracao || !lead}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-leadnexi-violet-600 text-[13px] font-bold text-leadnexi-on-accent transition-colors hover:bg-leadnexi-violet-600/90 disabled:opacity-50"
        >
          <FileText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Ficha completa
        </button>
        <button
          type="button"
          onClick={() => void alternarFunil()}
          disabled={demonstracao || ocupado}
          title={conversa.archived ? 'É lead: voltar para o funil' : 'Não é lead: tira do funil sem apagar a conversa'}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {conversa.archived ? <UserCheck aria-hidden className="h-4 w-4" strokeWidth={1.75} /> : <UserX aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
          {conversa.archived ? 'É lead' : 'Não é lead'}
        </button>
      </div>
    </aside>
  )
}

function Secao({ titulo, Icone, children }: { titulo: string; Icone?: typeof History; children: ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-3.5 last:border-b-0">
      <h3 className="m-0 mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {Icone && <Icone aria-hidden className="h-3 w-3" strokeWidth={2} />}
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function Linha({ Icone, rotulo, children }: { Icone: typeof Phone | typeof InstagramIcon; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1 text-[13px]" title={rotulo}>
      <Icone aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="sr-only">{rotulo}:</span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{children}</span>
    </div>
  )
}

function Vazio({ children }: { children: ReactNode }) {
  return <span className="font-normal text-muted-foreground">{children}</span>
}
