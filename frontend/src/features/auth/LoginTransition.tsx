import { LeadNexiMark } from '../../brand/LeadNexiMark.tsx'

export type LoginPhase = 'loading' | 'done'

const MARK_SIZE = 88

// Transição de login (BRAND.md, seção 8): o símbolo fica intacto (<LeadNexiMark>) e os efeitos são
// uma camada por cima, na mesma grade de 64: a ponte vai de (16,16) a (48,48).
// loading: um pulso de luz corre pela ponte sem parar (o tempo do servidor não é previsível).
// done: a ponte acende de ponta a ponta e o símbolo "respira" uma vez; em seguida o app abre.
// Com "reduzir movimento" no sistema, fica só o símbolo parado e o texto.
export function LoginTransition({ phase }: { phase: LoginPhase }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy motion-safe:animate-fade-in">
      <div className={`relative ${phase === 'done' ? 'motion-safe:animate-mark-pop' : ''}`}>
        <LeadNexiMark size={MARK_SIZE} />
        <svg
          aria-hidden
          width={MARK_SIZE}
          height={MARK_SIZE}
          viewBox="0 0 64 64"
          className="absolute inset-0 overflow-visible"
        >
          {phase === 'loading' ? (
            <circle
              cx="16"
              cy="16"
              r="3.5"
              className="fill-white motion-safe:animate-bridge-pulse motion-reduce:hidden"
              style={{ filter: 'drop-shadow(0 0 4px var(--lnx-logo-bridge))' }}
            />
          ) : (
            <line
              x1="16"
              y1="16"
              x2="48"
              y2="48"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              className="motion-safe:animate-bridge-light"
              style={{
                stroke: 'var(--lnx-logo-bridge)',
                filter: 'drop-shadow(0 0 6px var(--lnx-logo-bridge))',
              }}
            />
          )}
        </svg>
      </div>
      <p role="status" className="text-ui text-slate-300">
        {phase === 'loading' ? 'Entrando…' : 'Tudo certo'}
      </p>
    </div>
  )
}
