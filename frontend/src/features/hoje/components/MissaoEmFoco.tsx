import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Phone, SkipForward } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { formatPhoneBR } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { iconeDaOrigem } from '../../crm/origens'
import { contextoDaMissao, mensagemSugerida, TIPOS, type Missao } from '../missoes'
import { useConcluirMissao } from '../useConcluirMissao'
import { BotaoConversa } from './BotaoConversa'
import { BotaoWhatsApp } from './BotaoWhatsApp'
import { ModelosDeMensagem } from './ModelosDeMensagem'
import { CirculoConcluir, etiqueta, EtiquetaDaEtapa, EtiquetasDoLead, MenuAdiar, type AcoesDaMissao } from './pecas'

type MissaoEmFocoProps = {
  missao: Missao
  posicao: number
  total: number
  /** Cor da etapa do lead (a mesma da coluna no quadro do CRM). */
  corDaEtapa: string
  onAnterior: () => void
  onProxima: () => void
} & AcoesDaMissao

/** A missão em destaque (aberta por "Começar próxima ação"): tudo para agir sem abrir a ficha. */
export function MissaoEmFoco({ missao, posicao, total, corDaEtapa, onAnterior, onProxima, onAbrir, onMudou }: MissaoEmFocoProps) {
  const { tipo, lead } = missao
  const contexto = contextoDaMissao(lead, tipo)
  const [mensagem, setMensagem] = useState(() => mensagemSugerida(lead, tipo))
  const { feita, ocupado, podeMarcar, concluir, marcarFeita } = useConcluirMissao(lead, tipo, onMudou)
  const temMensagem = tipo === 'new' || tipo === 'follow-up'
  const origem = lead.source ? { nome: lead.source, ...iconeDaOrigem(lead.source) } : null

  // Atalhos: ← → navega, F marca como feito, Enter abre a ficha. Não disparam enquanto se digita
  // nem com outra janela aberta (a ficha do lead, por exemplo).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft') onAnterior()
      else if (e.key === 'ArrowRight') onProxima()
      else if (e.key === 'Enter') onAbrir(lead)
      else if ((e.key === 'f' || e.key === 'F') && podeMarcar) void concluir(mensagem)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onAnterior, onProxima, onAbrir, lead, podeMarcar, concluir, mensagem])

  return (
    <section
      className={cn('flex flex-col gap-5 rounded-2xl border border-t-[3px] border-border bg-card p-6 transition-opacity', TIPOS[tipo].faixa, feita && 'opacity-45')}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-bold text-muted-foreground">
          <span aria-hidden className={cn('h-2.5 w-2.5 rounded-full', TIPOS[tipo].ponto)} />
          {TIPOS[tipo].titulo}
        </span>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[13px] font-bold tabular-nums text-muted-foreground">
            {posicao} de {total}
          </span>
          <button
            type="button"
            onClick={onAnterior}
            disabled={posicao <= 1}
            aria-label="Missão anterior"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onProxima}
            disabled={posicao >= total}
            aria-label="Próxima missão"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAbrir(lead)}
            className={cn('cursor-pointer text-left text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-foreground hover:underline', feita && 'line-through')}
          >
            {lead.name}
          </button>
          <EtiquetasDoLead lead={lead} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EtiquetaDaEtapa lead={lead} cor={corDaEtapa} />
          {origem && (
            <span className={cn(etiqueta, 'border-border bg-muted/50 text-foreground')} title="Origem">
              <origem.Icone aria-hidden strokeWidth={1.75} className={cn('h-4 w-4', origem.cor)} />
              {origem.nome}
            </span>
          )}
          {lead.phone && (
            <span className={cn(etiqueta, 'border-border bg-muted/50 tabular-nums text-foreground')} title="Telefone">
              <Phone aria-hidden className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
              {formatPhoneBR(lead.phone)}
            </span>
          )}
        </div>
        <span className={cn('text-sm font-bold', contexto.cor)}>{contexto.texto}</span>
      </div>

      {temMensagem && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`mensagem-${lead.id}`} className="text-[13px] font-semibold text-muted-foreground">
              Mensagem
            </label>
            <ModelosDeMensagem lead={lead} mensagem={mensagem} onEscolher={setMensagem} />
          </div>
          <textarea
            id={`mensagem-${lead.id}`}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={4}
            maxLength={5000}
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium leading-6 text-foreground outline-none focus:border-leadnexi-violet/60"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 border-t border-border pt-4">
        {temMensagem && <BotaoWhatsApp lead={lead} mensagem={mensagem} onEnviado={marcarFeita} />}
        {tipo === 'response' && (
          <BotaoConversa lead={lead} className={cn(botaoPrincipalDoTopo, 'h-11 rounded-lg px-4 text-sm font-semibold')} onRegistrada={marcarFeita} />
        )}
        {tipo === 'meeting' && (
          <Button variant="outline" className={cn(botaoSecundarioDoTopo, 'h-11')} onClick={() => onAbrir(lead)}>
            Abrir
          </Button>
        )}
        {podeMarcar && (
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-muted-foreground">
            <CirculoConcluir lead={lead} tipo={tipo} feita={feita} ocupado={ocupado} onConcluir={() => void concluir(mensagem)} />
            {tipo === 'new' ? 'Já mandei' : 'Feito'}
          </span>
        )}
        {temMensagem && (
          <MenuAdiar
            leadId={lead.id}
            onAdiado={onMudou}
            className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-accent"
          />
        )}
        <Button variant="ghost" className="ml-auto h-11 gap-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={onProxima} disabled={posicao >= total}>
          Pular
          <SkipForward aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
      <p className="-mt-2 mb-0 text-xs font-medium text-muted-foreground">
        <Tecla>←</Tecla> <Tecla>→</Tecla> navega · {podeMarcar && (<><Tecla>F</Tecla> feito · </>)}
        <Tecla>Enter</Tecla> abre a ficha
      </p>
    </section>
  )
}

function Tecla({ children }: { children: string }) {
  return <kbd className="rounded border border-border bg-muted px-1.5 py-px font-marca text-[11px] font-bold text-foreground">{children}</kbd>
}
