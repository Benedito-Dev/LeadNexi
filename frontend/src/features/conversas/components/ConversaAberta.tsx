import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCheck, ChevronDown, Clock3, Columns3, IdCard, Lock, LoaderCircle, MessagesSquare, Send } from 'lucide-react'
import { Link } from 'react-router'
import { InstagramIcon, WhatsAppLogo } from '@/brand/icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FotoRedonda } from '@/components/ui/foto-redonda'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { enviarMensagem, fotoDoLead } from '../api'
import type { Etapa } from '../../crm/types'
import type { Conversa, Historico, Mensagem } from '../tipos'

/** O Instagram aceita até 1.000 bytes por mensagem (acento e emoji ocupam mais de 1). */
const LIMITE_EM_BYTES = 1000
const bytes = (texto: string) => new TextEncoder().encode(texto).length

/** "Hoje", "Ontem" ou "qui., 23 de out." */
function rotuloDoDia(iso: string) {
  const data = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  if (data.toDateString() === hoje.toDateString()) return 'Hoje'
  if (data.toDateString() === ontem.toDateString()) return 'Ontem'
  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Etiqueta do topo da conversa (canal, etapa, prazo). */
const etiqueta = 'inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground'

/**
 * Rola a área até o fim num deslize próprio (0,4 a 0,7 s, desacelerando no final), igual em qualquer
 * navegador: o "smooth" nativo, numa distância curta, parece um salto. Devolve como cancelar.
 */
function deslizarAteOFim(area: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    area.scrollTop = area.scrollHeight
    return
  }
  const inicio = area.scrollTop
  // Mais longe, um pouco mais devagar: de 0,4 s (uma tela ou menos) até 0,7 s
  const duracao = Math.min(400 + ((area.scrollHeight - area.clientHeight - inicio) / area.clientHeight) * 150, 700)
  const comeco = performance.now()
  let quadro = 0
  const passo = (agora: number) => {
    const progresso = Math.min((agora - comeco) / duracao, 1)
    const destino = area.scrollHeight - area.clientHeight
    area.scrollTop = inicio + (destino - inicio) * (1 - Math.pow(1 - progresso, 3))
    if (progresso < 1) quadro = requestAnimationFrame(passo)
  }
  quadro = requestAnimationFrame(passo)
  return () => cancelAnimationFrame(quadro)
}

/** Até quantas alturas da área de distância do fim a conversa desliza (mais longe que isso, salta). */
const TELAS_PARA_DESLIZAR = 2

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const MOTIVOS: Record<NonNullable<Historico['blocked']>, string> = {
  'no-direct': 'Esta pessoa nunca mandou direct: o Instagram só deixa responder quem escreveu primeiro.',
  'window-closed': 'Passaram 24 h da última mensagem dela: o Instagram só deixa responder dentro desse prazo.',
  reconnect: 'A conexão com o Instagram expirou. Conecte de novo para responder.',
  demo: 'Demonstração: assim fica uma conversa do WhatsApp. O canal entra na etapa 7 do mapa.',
}

type Props = {
  conversa: Conversa | null
  historico: Historico | null
  /** Mensagem enviada: entra no fim da conversa na hora */
  onEnviada: (mensagem: Mensagem) => void
  /** Celular: volta para a lista */
  onVoltar: () => void
  /** Etapa do lead e as do funil, para trocar pela etiqueta do topo */
  etapa: { id: string; nome: string; cor: string } | null
  etapas: Etapa[]
  cores: Record<string, string>
  onMover: (etapa: Etapa) => void
  /** Ficha à direita aberta ou recolhida */
  fichaVisivel: boolean
  onAlternarFicha: () => void
}

/** Coluna do meio: a conversa aberta, separada por dia, e o campo de resposta. */
export function ConversaAberta({ conversa, historico, onEnviada, onVoltar, etapa, etapas, cores, onMover, fichaVisivel, onAlternarFicha }: Props) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  // Quantas mensagens já estavam na tela na última rolagem (0 = acabou de abrir)
  const vistasRef = useRef(0)
  // Mensagens que chegam (ou que você manda) depois de abrir a conversa entram animadas
  const [abertaEm] = useState(() => Date.now())
  const quantas = historico?.messages.length ?? 0
  const ultimaEnviada = historico?.messages.at(-1)?.direction === 'sent'

  // Rola até o fundo de verdade: ao abrir, direto; com mensagem nova e perto do fim, deslizando;
  // longe do fim, só salta se a mensagem nova foi sua (a dele não tira você de onde está lendo)
  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area || quantas === 0) return
    const anteriores = vistasRef.current
    vistasRef.current = quantas
    if (anteriores === 0) {
      area.scrollTop = area.scrollHeight
      return
    }
    if (quantas <= anteriores) return
    const distancia = area.scrollHeight - area.clientHeight - area.scrollTop
    if (distancia < area.clientHeight * TELAS_PARA_DESLIZAR) return deslizarAteOFim(area)
    if (ultimaEnviada) area.scrollTop = area.scrollHeight
  }, [quantas, ultimaEnviada])

  if (!conversa) {
    return (
      <section className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center md:flex">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-leadnexi-violet/10 text-leadnexi-violet-texto">
          <MessagesSquare aria-hidden className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <p className="m-0 text-base font-extrabold text-foreground">Escolha uma conversa</p>
        <p className="m-0 max-w-xs text-sm font-medium text-muted-foreground">As mensagens do direct aparecem aqui. Você responde sem abrir o Instagram.</p>
      </section>
    )
  }

  const tamanho = bytes(texto)
  const whatsapp = conversa.canal === 'whatsapp'
  const podeEnviar = Boolean(historico?.canReply) && texto.trim().length > 0 && tamanho <= LIMITE_EM_BYTES && !enviando

  const enviar = async (evento?: FormEvent) => {
    evento?.preventDefault()
    if (!podeEnviar) return
    setEnviando(true)
    try {
      onEnviada(await enviarMensagem(conversa.id, texto.trim()))
      setTexto('')
    } catch (e) {
      addToast('error', 'Mensagem não enviada', e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'O Instagram não respondeu. Tente de novo.', 6000)
    } finally {
      setEnviando(false)
    }
  }

  // Mensagens agrupadas por dia, com o dia num separador
  const grupos: { dia: string; mensagens: Mensagem[] }[] = []
  for (const mensagem of historico?.messages ?? []) {
    const dia = rotuloDoDia(mensagem.createdAt)
    const ultimo = grupos.at(-1)
    if (ultimo?.dia === dia) ultimo.mensagens.push(mensagem)
    else grupos.push({ dia, mensagens: [mensagem] })
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onVoltar} aria-label="Voltar para as conversas" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent md:hidden">
          <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <FotoRedonda src={fotoDoLead(conversa.avatarId)} nome={conversa.name} className="h-12 w-12 bg-leadnexi-violet/15 text-base text-leadnexi-violet-texto" />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-base font-semibold text-foreground">{conversa.name}</p>
          <p className="m-0 truncate text-xs tabular-nums text-muted-foreground">
            {conversa.canal === 'whatsapp' ? conversa.telefone : conversa.instagramUsername ? `@${conversa.instagramUsername}` : 'Instagram'}
          </p>
          {/* Etiquetas: o canal e a etapa (clicável para mover) */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={etiqueta}>
              {conversa.canal === 'whatsapp' ? <WhatsAppLogo aria-hidden size={13} className="text-whatsapp" /> : <InstagramIcon aria-hidden size={13} />}
              {conversa.canal === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
            </span>
            {conversa.archived ? (
              <span className={etiqueta}>Não é lead</span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" disabled={!etapa || etapas.length === 0} className={cn(etiqueta, 'hover:bg-accent disabled:opacity-60')} title="Mover de etapa">
                    <Columns3 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {etapa && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: etapa.cor }} />}
                    {etapa?.nome ?? conversa.stageName}
                    <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="font-marca">
                  {/* Perdido pede o motivo: fica para a ficha */}
                  {etapas
                    .filter((e) => e.stageType !== 'LOST')
                    .map((e) => (
                      <DropdownMenuItem key={e.id} onSelect={() => onMover(e)} className={cn('gap-2 font-medium', e.id === etapa?.id && 'font-bold')}>
                        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: cores[e.id] ?? '#5C8AF6' }} />
                        {e.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {historico?.canReply && historico.replyUntil && (
              <span className={etiqueta} title="O Instagram só deixa responder até 24 h depois da última mensagem dela">
                <Clock3 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Responda até {hora(historico.replyUntil)}
                {rotuloDoDia(historico.replyUntil) !== 'Hoje' && ` (${rotuloDoDia(historico.replyUntil).toLowerCase()})`}
              </span>
            )}
          </div>
        </div>
        {/* Mostra ou recolhe a ficha da direita (só em telas largas, onde ela cabe) */}
        <button
          type="button"
          onClick={onAlternarFicha}
          aria-pressed={fichaVisivel}
          title={fichaVisivel ? 'Recolher a ficha' : 'Mostrar a ficha'}
          className={cn(
            'hidden h-9 shrink-0 items-center gap-2 self-start rounded-lg border px-3 text-[13px] font-semibold transition-colors xl:inline-flex',
            fichaVisivel ? 'border-leadnexi-violet/50 bg-leadnexi-violet/10 text-leadnexi-violet-texto' : 'border-border text-foreground hover:bg-accent',
          )}
        >
          <IdCard aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Ficha
        </button>
      </header>

      <div ref={areaRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-muted/50 px-5 py-4">
        {historico === null ? (
          <div aria-busy="true" aria-label="Carregando mensagens" className="flex flex-col gap-3">
            {['w-2/3', 'ml-auto w-1/2', 'w-3/5', 'ml-auto w-2/5'].map((classe) => (
              <span key={classe} className={cn('h-10 animate-pulse rounded-2xl bg-muted', classe)} />
            ))}
          </div>
        ) : historico.messages.length === 0 ? (
          <p className="m-0 py-10 text-center text-sm font-medium text-muted-foreground">Nenhuma mensagem nesta conversa ainda.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {grupos.map((grupo) => (
              <div key={grupo.dia} className="flex flex-col gap-1.5">
                <span className="mx-auto my-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground first-letter:uppercase">{grupo.dia}</span>
                {grupo.mensagens.map((mensagem, i) => {
                  const enviada = mensagem.direction === 'sent'
                  const seguida = grupo.mensagens[i + 1]?.direction === mensagem.direction
                  return (
                    <div
                      key={mensagem.id}
                      className={cn(
                        'flex',
                        enviada ? 'justify-end' : 'justify-start',
                        new Date(mensagem.createdAt).getTime() > abertaEm && 'duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-3',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-xl px-4 py-2.5 text-[15px] leading-6 shadow-sm',
                          // Suas mensagens na cor do canal: violeta claro no Instagram, verde no WhatsApp
                          enviada ? (whatsapp ? 'bg-chat-wa-out text-chat-wa-out-foreground' : 'bg-leadnexi-violet/15 text-foreground') : 'bg-chat-wa-in text-chat-wa-in-foreground',
                          // A ponta da bolha só na última de uma sequência do mesmo lado
                          !seguida && (enviada ? 'rounded-br-sm' : 'rounded-bl-sm'),
                        )}
                      >
                        <p className="m-0 whitespace-pre-wrap break-words">{mensagem.text || '(sem texto: foto, áudio ou figurinha)'}</p>
                        <span className="mt-1 flex items-center justify-end gap-1 text-xs tabular-nums text-muted-foreground">
                          {hora(mensagem.createdAt)}
                          {enviada && <CheckCheck aria-label="Enviada" className={cn('h-3.5 w-3.5', whatsapp ? 'text-chat-wa-tick-read' : 'text-leadnexi-violet-texto')} strokeWidth={2} />}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {historico && !historico.canReply && historico.blocked ? (
        <div className="flex items-start gap-2.5 border-t border-border bg-card px-4 py-3 text-[13px] font-medium text-muted-foreground">
          <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>
            {MOTIVOS[historico.blocked]}{' '}
            {historico.blocked === 'reconnect' && (
              <Link to="/configuracoes/canais" className="font-bold text-leadnexi-cyan-texto no-underline hover:underline">
                Conectar de novo
              </Link>
            )}
          </span>
        </div>
      ) : (
        <form onSubmit={(e) => void enviar(e)} className="flex items-end gap-3 border-t border-border bg-card px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                // Enter envia; Shift+Enter quebra a linha
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void enviar()
                }
              }}
              rows={1}
              disabled={!historico}
              placeholder="Escreva a resposta…"
              title="Enter envia, Shift+Enter quebra a linha"
              aria-label="Resposta"
              className="block max-h-36 min-h-12 w-full resize-none rounded-3xl border border-input bg-background px-5 py-3 text-sm leading-6 text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground focus:border-leadnexi-violet/60"
            />
            {tamanho > LIMITE_EM_BYTES * 0.8 && (
              <span className={cn('absolute -top-5 right-1 text-[11px] font-semibold tabular-nums', tamanho > LIMITE_EM_BYTES ? 'text-leadnexi-danger' : 'text-muted-foreground')}>
                {tamanho}/{LIMITE_EM_BYTES}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!podeEnviar}
            aria-label="Enviar"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-leadnexi-violet to-leadnexi-violet-600 text-leadnexi-on-accent shadow-[0_6px_16px_-6px_hsl(var(--leadnexi-violet)/0.7)] transition-all hover:-translate-y-px disabled:translate-y-0 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {enviando ? <LoaderCircle aria-hidden className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Send aria-hidden className="h-5 w-5" strokeWidth={2} />}
          </button>
        </form>
      )}
    </section>
  )
}
