import { ArrowLeft, ChevronRight, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

/** Trilha "Voltar | casa > página" do Rizar. */
export function AppBreadcrumb({ titulo }: { titulo: string }) {
  const navigate = useNavigate()
  const podeVoltar = window.history.length > 1

  return (
    <nav className="flex items-center gap-2 text-sm text-foreground">
      <button
        type="button"
        onClick={() => navigate(-1)}
        disabled={!podeVoltar}
        aria-label="Voltar para a página anterior"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="font-medium">Voltar</span>
      </button>

      <span className="text-muted-foreground/40" aria-hidden="true">
        |
      </span>

      <Link to="/" aria-label="Ir para a tela inicial" className="flex items-center text-foreground hover:opacity-70 transition-opacity">
        <Home className="h-3.5 w-3.5" />
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="font-medium">{titulo}</span>
    </nav>
  )
}
