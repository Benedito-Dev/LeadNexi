import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type Opcao = { label: string; warnings: { detail: string }[] }

type OpcoesDaIAProps = {
  opcoes: Opcao[]
  escolhida: number | null
  onEscolher: (indice: number) => void
  /** Aviso geral da IA, além dos da opção (ex.: "Parece resposta automática"). */
  aviso?: string | null
}

/**
 * As opções que a IA sugeriu, trocadas com um clique, e os avisos da escolhida (regras de ouro:
 * número sem fonte, promessa de resultado). Peça única (docs/produto/MAPA.md, seção 4).
 */
export function OpcoesDaIA({ opcoes, escolhida, onEscolher, aviso }: OpcoesDaIAProps) {
  const avisos = [...(aviso ? [aviso] : []), ...(escolhida !== null ? (opcoes[escolhida]?.warnings ?? []).map((w) => w.detail) : [])]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sugestões da IA">
        <span className="mr-0.5 text-xs font-semibold text-muted-foreground">Sugestões da IA</span>
        {opcoes.map((opcao, indice) => (
          <button
            key={indice}
            type="button"
            onClick={() => onEscolher(indice)}
            aria-pressed={escolhida === indice}
            title={indice === 0 ? 'Opção principal' : `Variação ${indice}`}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              escolhida === indice
                ? 'border-leadnexi-violet/50 bg-leadnexi-violet/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {opcao.label}
          </button>
        ))}
      </div>
      {avisos.map((texto) => (
        <p key={texto} className="m-0 flex items-start gap-2 text-[13px] font-medium text-warn-foreground">
          <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
          {texto}
        </p>
      ))}
    </div>
  )
}
