/**
 * Marca do que o Claude fez pelo servidor MCP (`via = "claude"` no histórico do lead), ao lado da
 * data. Sem marca, foi feito nas telas.
 */
export function ViaClaude({ via }: { via?: string | null }) {
  if (via !== 'claude') return null
  return <span className="font-semibold text-leadnexi-violet-texto"> · via Claude</span>
}
