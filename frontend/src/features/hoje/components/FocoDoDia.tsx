import { useState } from 'react'
import { barraDeSegmentos, segmento } from '@/components/ui/segmentos'
import { cn } from '@/lib/utils'
import { contextoDaMissao, TIPOS, TIPOS_DE_ACAO, type Missao, type TipoMissao } from '../missoes'
import type { PainelDeHoje } from '../tipos'
import { MissaoEmFoco } from './MissaoEmFoco'
import { FilaVazia, OrigemDoLead, Placar, type AcoesDaMissao } from './pecas'

type FocoDoDiaProps = {
  painel: PainelDeHoje
  fila: Missao[]
  nome: string
  /** Cor de cada etapa (id → cor), a mesma das colunas do quadro do CRM. */
  coresDasEtapas: Record<string, string>
  onComecar: () => void
} & AcoesDaMissao

const ORDEM: TipoMissao[] = ['response', 'follow-up', 'new', 'meeting']

const acoesDa = (fila: Missao[]) => fila.filter((m) => TIPOS_DE_ACAO.includes(m.tipo))

/** Abas "Todas · Responder primeiro · Follow-ups..." com a bolinha da cor e a contagem. */
function AbasDeTipo({
  tipos,
  fila,
  aba,
  onAba,
}: {
  tipos: TipoMissao[]
  fila: Missao[]
  aba: TipoMissao | 'todas'
  onAba: (aba: TipoMissao | 'todas') => void
}) {
  return (
    <div className={cn(barraDeSegmentos, 'gap-1 p-1')} role="tablist" aria-label="Tipo de missão">
      {(['todas', ...tipos] as const).map((valor) => (
        <button key={valor} type="button" role="tab" aria-selected={aba === valor} onClick={() => onAba(valor)} className={segmento(aba === valor)}>
          {valor !== 'todas' && <span aria-hidden className={cn('h-2 w-2 rounded-full', TIPOS[valor].ponto)} />}
          {valor === 'todas' ? 'Todas' : TIPOS[valor].titulo}
          <span className="tabular-nums opacity-70">{valor === 'todas' ? fila.length : fila.filter((m) => m.tipo === valor).length}</span>
        </button>
      ))}
    </div>
  )
}

/** Tela Hoje: placar à esquerda; à direita, a missão em foco e a fila clicável embaixo. */
export function FocoDoDia({ painel, fila, nome, coresDasEtapas, onComecar, onAbrir, onMudou }: FocoDoDiaProps) {
  const acoes = acoesDa(fila)
  // Ações primeiro (responder, follow-ups, novas lojas) e os compromissos no fim
  const todas = [...acoes, ...fila.filter((m) => m.tipo === 'meeting')]
  const tipos = ORDEM.filter((tipo) => todas.some((m) => m.tipo === tipo))
  const [aba, setAba] = useState<TipoMissao | 'todas'>('todas')
  const ordem = aba === 'todas' ? todas : todas.filter((m) => m.tipo === aba)
  const [indice, setIndice] = useState(0)
  // Quando uma missão sai da fila (feita ou adiada), a próxima ocupa o mesmo lugar
  const atual = Math.min(indice, Math.max(ordem.length - 1, 0))
  const emFoco = ordem[atual]

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:gap-7">
      <Placar painel={painel} nome={nome} pendentes={acoes} onComecar={onComecar} />
      <main className="flex min-w-0 flex-col gap-5">
        {!emFoco ? (
          <FilaVazia feitasHoje={painel.actionsDoneToday} />
        ) : (
          <>
            <MissaoEmFoco
              key={`${emFoco.tipo}-${emFoco.lead.id}`}
              missao={emFoco}
              posicao={atual + 1}
              total={ordem.length}
              corDaEtapa={coresDasEtapas[emFoco.lead.stage.id] ?? '#5C8AF6'}
              onAnterior={() => setIndice(Math.max(atual - 1, 0))}
              onProxima={() => setIndice(Math.min(atual + 1, ordem.length - 1))}
              onAbrir={onAbrir}
              onMudou={onMudou}
            />
            {todas.length > 1 && (
              <section className="rounded-2xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <h3 className="m-0 text-base font-extrabold text-foreground">
                    Fila de hoje <span className="font-bold tabular-nums text-muted-foreground">{todas.length}</span>
                  </h3>
                  <AbasDeTipo tipos={tipos} fila={todas} aba={aba} onAba={(valor) => {
                    setAba(valor)
                    setIndice(0)
                  }} />
                </div>
                <ol className="m-0 max-h-[420px] divide-y divide-border overflow-y-auto p-0">
                  {ordem.map((missao, i) => {
                    const contexto = contextoDaMissao(missao.lead, missao.tipo)
                    const selecionada = i === atual
                    return (
                      <li key={`${missao.tipo}-${missao.lead.id}`}>
                        {/* Clicar traz a missão para o foco */}
                        <button
                          type="button"
                          onClick={() => setIndice(i)}
                          aria-current={selecionada}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            selecionada ? 'bg-leadnexi-violet/10' : 'hover:bg-accent/60',
                          )}
                        >
                          <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                          <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', TIPOS[missao.tipo].ponto)} />
                          <OrigemDoLead origem={missao.lead.source} />
                          <span className="min-w-0 flex-1">
                            <span className={cn('block truncate text-sm text-foreground', selecionada ? 'font-extrabold' : 'font-bold')}>
                              {missao.lead.name}
                            </span>
                            <span className={cn('block truncate text-xs font-semibold', contexto.cor)}>{contexto.texto}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
