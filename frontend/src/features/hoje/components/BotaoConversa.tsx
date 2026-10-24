import { useState, type ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { registrarConversa, type ComoFicou } from '../api'
import { linkDoWhatsApp } from '../textos'
import type { LeadDoPainel } from '../tipos'
import { useAbrirWhatsApp } from '../useAbrirWhatsApp'

const OPCOES: { valor: ComoFicou; rotulo: string; detalhe: string }[] = [
  { valor: 'waiting', rotulo: 'Aguardando ele', detalhe: 'Volta para você em 2 dias se ele não responder' },
  { valor: 'later', rotulo: 'Combinamos outro dia', detalhe: 'Volta para você no dia combinado' },
  { valor: 'meeting', rotulo: 'Marcamos reunião', detalhe: 'Vai para Reunião no quadro' },
  { valor: 'won', rotulo: 'Fechou', detalhe: 'Vira cliente' },
  { valor: 'lost', rotulo: 'Não tem interesse', detalhe: 'Vai para Perdido' },
]

/** "AAAA-MM-DDT10:00" daqui a `dias`, no horário local (valor de input de data). */
function dataLocal(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() + dias)
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}T10:00`
}

type BotaoConversaProps = {
  lead: LeadDoPainel
  className?: string
  /** Texto e ícone do botão (padrão: "Continuar conversa" com balão). */
  rotulo?: string
  icone?: ReactNode
  /** A conversa foi registrada (o lead sai de "Sua vez"). */
  onRegistrada: () => void
}

/**
 * "Continuar conversa": abre a conversa do lead no WhatsApp (sem texto pronto) e, na volta,
 * pergunta como ficou. A resposta registra a ação do dia e decide quando o lead volta para a fila.
 */
export function BotaoConversa({ lead, className, rotulo = 'Continuar conversa', icone, onRegistrada }: BotaoConversaProps) {
  const { abrindo, voltou: perguntando, setVoltou: setPerguntando, abrir } = useAbrirWhatsApp()
  const [escolha, setEscolha] = useState<ComoFicou | null>(null)
  const [quando, setQuando] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState(false)
  const link = lead.phone ? linkDoWhatsApp(lead.phone) : null
  const precisaData = escolha === 'later' || escolha === 'meeting'

  const fechar = () => {
    setPerguntando(false)
    setEscolha(null)
    setErro(false)
  }

  const escolher = (valor: ComoFicou) => {
    setEscolha(valor)
    setQuando(valor === 'later' ? dataLocal(3).slice(0, 10) : dataLocal(1))
  }

  const salvar = async () => {
    if (!escolha) return
    setRegistrando(true)
    setErro(false)
    try {
      // Retorno combinado sem hora: às 10h do dia escolhido
      const at = precisaData ? new Date(escolha === 'later' ? `${quando}T10:00` : quando).toISOString() : undefined
      await registrarConversa(lead.id, escolha, at)
      fechar()
      onRegistrada()
    } catch {
      setErro(true)
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (link) abrir(link)
          else setPerguntando(true)
        }}
        disabled={abrindo || registrando}
        title={link ? 'Abrir a conversa no WhatsApp' : 'Registrar como ficou a conversa'}
        className={cn('inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-60', className)}
      >
        {icone ?? <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
        {abrindo ? 'Abrindo…' : rotulo}
      </button>

      {perguntando && (
        <div
          role="alertdialog"
          aria-label={`Como ficou a conversa com ${lead.name}`}
          className="fixed bottom-4 right-4 z-50 w-[min(400px,calc(100vw-32px))] rounded-xl border border-border bg-card p-4 font-marca text-foreground shadow-lg"
        >
          <p className="m-0 text-sm font-bold">Como ficou a conversa com {lead.name}?</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {OPCOES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => escolher(opcao.valor)}
                aria-pressed={escolha === opcao.valor}
                className={cn(
                  'flex flex-col rounded-lg border px-3 py-2 text-left transition-colors',
                  escolha === opcao.valor ? 'border-leadnexi-violet bg-leadnexi-violet/10' : 'border-border hover:bg-accent',
                )}
              >
                <span className="text-sm font-bold">{opcao.rotulo}</span>
                <span className="text-xs font-medium text-muted-foreground">{opcao.detalhe}</span>
              </button>
            ))}
          </div>
          {precisaData && (
            <label className="mt-3 flex flex-col gap-1 text-[13px] font-semibold text-muted-foreground">
              {escolha === 'later' ? 'Dia do retorno' : 'Dia e hora da reunião'}
              <input
                type={escolha === 'later' ? 'date' : 'datetime-local'}
                value={quando}
                onChange={(e) => setQuando(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-leadnexi-violet/60"
              />
            </label>
          )}
          {erro && <p className="mb-0 mt-2 text-[13px] text-leadnexi-danger">Não foi possível registrar. Tente de novo.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" className={botaoPrincipalDoTopo} onClick={() => void salvar()} disabled={!escolha || (precisaData && !quando) || registrando}>
              {registrando ? 'Registrando…' : 'Salvar'}
            </Button>
            <Button size="sm" variant="outline" className={botaoSecundarioDoTopo} onClick={fechar} disabled={registrando}>
              Ainda não respondi
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
