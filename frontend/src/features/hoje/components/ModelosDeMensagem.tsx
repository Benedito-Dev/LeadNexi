import { cn } from '@/lib/utils'
import { modelosDeMensagem } from '../missoes'
import type { LeadDoPainel } from '../tipos'

/** Botões que trocam o texto da mensagem pelos modelos da cadência, com um clique. */
export function ModelosDeMensagem({ lead, mensagem, onEscolher }: { lead: LeadDoPainel; mensagem: string; onEscolher: (texto: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Modelos de mensagem">
      {modelosDeMensagem(lead).map((modelo) => {
        const escolhido = modelo.texto === mensagem
        return (
          <button
            key={modelo.rotulo}
            type="button"
            onClick={() => onEscolher(modelo.texto)}
            aria-pressed={escolhido}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              escolhido
                ? 'border-leadnexi-violet/50 bg-leadnexi-violet/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {modelo.rotulo}
          </button>
        )
      })}
    </div>
  )
}
