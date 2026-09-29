import { ArrowLeft, House } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { LeadNexiLogo } from '../brand/LeadNexiMark.tsx'

// Página 404 (BRAND.md, seção 9.4): grade de nós com uma trilha que se interrompe no meio do
// caminho (linguagem gráfica da seção 6.1) — a conexão não chegou ao destino.
export function NotFoundPage() {
  const navigate = useNavigate()
  // Veio de outra página do app: "Voltar" faz sentido; link aberto direto, não
  const canGoBack = typeof window !== 'undefined' && window.history.state?.idx > 0

  return (
    <div className="flex min-h-dvh flex-col bg-navy bg-dot-grid">
      <title>Página não encontrada · LeadNexi</title>
      <header className="px-6 py-6 sm:px-10">
        <Link to="/" aria-label="LeadNexi, ir para o início" className="inline-flex rounded-sm">
          <LeadNexiLogo size={28} />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <BrokenTrail className="w-full max-w-md" />

        <p className="mt-10 rounded-full bg-violet-tint px-2.5 py-1 text-xs leading-none font-bold text-violet-300">
          Erro 404
        </p>
        <h1 className="mt-4 text-h1">Página não encontrada</h1>
        <p className="mt-3 max-w-md text-body text-slate-400">
          O link pode estar incompleto ou a página mudou de lugar. Seus leads continuam onde estavam.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-violet-600 px-5 text-ui font-bold text-on-accent transition-colors"
          >
            <House aria-hidden size={18} strokeWidth={1.75} />
            Ir para o início
          </Link>
          {canGoBack && (
            <button
              type="button"
              onClick={() => void navigate(-1)}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-navy-600 px-5 text-ui font-bold text-white transition-colors hover:bg-navy-800"
            >
              <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
              Voltar
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Trilha na grade de 32px: nó de início (cyan) → horizontal → 45° → horizontal, e aí a linha
 * se interrompe. O resto do caminho segue tracejado (trilha secundária) até um nó vazio.
 */
function BrokenTrail({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 448 160" role="img" aria-label="Trilha de conexão interrompida" className={className}>
      <g fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M48 112H112L176 48H240" className="stroke-violet" />
        <path d="M288 48L352 112H400" strokeDasharray="2 12" className="stroke-trail" />
      </g>
      {/* Sinal de corte (//) no ponto da quebra */}
      <path d="M250 60L262 36M266 60L278 36" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-trail" />
      <circle cx="48" cy="112" r="9" className="fill-cyan" />
      <circle cx="176" cy="48" r="6" className="fill-violet" />
      <circle cx="240" cy="48" r="6" className="fill-violet" />
      <circle cx="400" cy="112" r="9" strokeWidth="3" strokeDasharray="4 5" className="fill-navy stroke-trail" />
    </svg>
  )
}
