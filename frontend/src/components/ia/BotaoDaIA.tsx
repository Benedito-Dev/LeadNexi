import { LoaderCircle, Sparkles } from 'lucide-react'

type BotaoDaIAProps = {
  rotulo: string
  /** Texto enquanto a IA trabalha (padrão: "Escrevendo…"). */
  rotuloOcupado?: string
  ocupado: boolean
  desabilitado: boolean
  /** Dica do botão: o que a IA faz ou, desligado, o que falta. */
  dica: string
  onClick: () => void
}

/**
 * Botão das ações de IA ("Escrever com IA", "Gerar mensagem"…): contorno em gradiente da marca;
 * desligado, fica apagado e a dica diz o que falta. Peça única (docs/produto/MAPA.md, seção 4).
 */
export function BotaoDaIA({ rotulo, rotuloOcupado = 'Escrevendo…', ocupado, desabilitado, dica, onClick }: BotaoDaIAProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      title={dica}
      className="group rounded-full bg-gradient-to-r from-leadnexi-violet to-leadnexi-cyan p-px transition-opacity disabled:cursor-not-allowed disabled:from-border disabled:to-border"
    >
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-background px-3 text-xs font-bold text-foreground transition-colors group-enabled:group-hover:bg-leadnexi-violet/10 group-disabled:text-muted-foreground">
        {ocupado ? (
          <LoaderCircle aria-hidden className="h-3.5 w-3.5 animate-spin text-leadnexi-violet-texto" strokeWidth={2} />
        ) : (
          <Sparkles aria-hidden className="h-3.5 w-3.5 text-leadnexi-violet-texto group-disabled:text-muted-foreground" strokeWidth={2} />
        )}
        {ocupado ? rotuloOcupado : rotulo}
      </span>
    </button>
  )
}
