import { useEffect, useState } from 'react'
import { SkipForward } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ICONE_DA_ETAPA } from '../../crm/etapas'
import { contextoDaMissao, mensagemSugerida, type Missao } from '../missoes'
import { useConcluirMissao } from '../useConcluirMissao'
import { useMensagemDaIA } from '../useMensagemDaIA'
import { BotaoConversa } from './BotaoConversa'
import { BotaoWhatsApp } from './BotaoWhatsApp'
import { BotaoGerarMensagem, OpcoesDaIA } from './MensagemDaIA'
import { ModelosDeMensagem } from './ModelosDeMensagem'
import { CirculoConcluir, EtiquetasDoLead, MenuAdiar, type AcoesDaMissao } from './pecas'

type MissaoEmFocoProps = {
  missao: Missao
  posicao: number
  total: number
  /** Cor da etapa do lead (a mesma da coluna no quadro do CRM). */
  corDaEtapa: string
  onAnterior: () => void
  onProxima: () => void
} & AcoesDaMissao

/**
 * A missão em destaque (aberta por "Começar próxima ação"): quem é, por que agora e o que fazer,
 * cada coisa uma vez só. Origem, telefone e o resto do lead ficam na ficha (clique no nome ou Enter).
 */
export function MissaoEmFoco({ missao, posicao, total, corDaEtapa, onAnterior, onProxima, onAbrir, onMudou }: MissaoEmFocoProps) {
  const { tipo, lead } = missao
  const contexto = contextoDaMissao(lead, tipo)
  const [mensagem, setMensagem] = useState(() => mensagemSugerida(missao))
  const { feita, ocupado, podeMarcar, concluir, marcarFeita } = useConcluirMissao(lead, tipo, onMudou)
  const temMensagem = tipo === 'new' || tipo === 'follow-up'
  const ia = useMensagemDaIA(lead.id)
  const IconeDaEtapa = ICONE_DA_ETAPA[lead.stage.stageType]

  // Atalhos: ← → navega, F marca como feito, Enter abre a ficha (aparecem no title dos botões). Não
  // disparam enquanto se digita nem com outra janela aberta (a ficha do lead, por exemplo).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft') onAnterior()
      else if (e.key === 'ArrowRight') onProxima()
      else if (e.key === 'Enter') onAbrir(lead)
      else if ((e.key === 'f' || e.key === 'F') && podeMarcar) void concluir(mensagem, ia.origem)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onAnterior, onProxima, onAbrir, lead, podeMarcar, concluir, mensagem, ia.origem])

  return (
    <section className={cn('flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 transition-opacity', feita && 'opacity-45')}>
      {/* Onde estou na fila; o X do Dialog fica à direita desta linha */}
      <div className="flex items-center gap-3 pr-8">
        <div
          role="progressbar"
          aria-valuenow={posicao}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Posição na fila"
          className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-flow transition-[width]" style={{ width: `${(posicao / total) * 100}%` }} />
        </div>
        <span className="text-[13px] font-bold tabular-nums text-muted-foreground">
          {posicao} de {total}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAbrir(lead)}
            title="Abrir ficha (Enter)"
            className={cn('cursor-pointer text-left text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-foreground hover:underline', feita && 'line-through')}
          >
            {lead.name}
          </button>
          <EtiquetasDoLead lead={lead} />
        </div>
        {/* Por que agora: o ícone da etapa na cor da coluna diz onde o lead está no funil */}
        <p className={cn('m-0 flex items-center gap-2 text-sm font-semibold', contexto.atrasado ? 'text-warn-foreground' : 'text-foreground')}>
          <span title={`Etapa: ${lead.stage.name}`} className="inline-flex">
            <IconeDaEtapa className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: corDaEtapa }} aria-hidden />
          </span>
          {contexto.texto}
        </p>
      </div>

      {temMensagem && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`mensagem-${lead.id}`} className="text-[13px] font-semibold text-muted-foreground">
              Mensagem
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <ModelosDeMensagem
                missao={missao}
                mensagem={mensagem}
                onEscolher={(texto) => {
                  setMensagem(texto)
                  ia.desmarcar()
                }}
              />
              <BotaoGerarMensagem ia={ia} onGerada={setMensagem} />
            </div>
          </div>
          <OpcoesDaIA ia={ia} onEscolher={setMensagem} />
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
        {temMensagem && <BotaoWhatsApp lead={lead} mensagem={mensagem} origem={ia.origem} onEnviado={marcarFeita} />}
        {tipo === 'response' && (
          <BotaoConversa lead={lead} className={cn(botaoPrincipalDoTopo, 'h-11 rounded-lg px-4 text-sm font-semibold')} onRegistrada={marcarFeita} />
        )}
        {tipo === 'meeting' && (
          <Button variant="outline" className={cn(botaoSecundarioDoTopo, 'h-11')} onClick={() => onAbrir(lead)}>
            Abrir ficha
          </Button>
        )}
        {podeMarcar && (
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-muted-foreground">
            <CirculoConcluir lead={lead} tipo={tipo} feita={feita} ocupado={ocupado} onConcluir={() => void concluir(mensagem, ia.origem)} />
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
        <Button
          variant="ghost"
          className="ml-auto h-11 gap-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onProxima}
          disabled={posicao >= total}
          title="Pular (→) · ← volta"
        >
          Pular
          <SkipForward aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </section>
  )
}
