/**
 * Marca do que não foi feito nas telas, ao lado da data no histórico do lead: o Claude pelo
 * servidor MCP (`via = "claude"`) ou uma automação do Instagram (`via = "automacao"`).
 */
export function ViaClaude({ via }: { via?: string | null }) {
  if (via === 'automacao') return <span className="font-semibold text-leadnexi-violet-texto"> · via automação</span>
  if (via !== 'claude') return null
  return <span className="font-semibold text-leadnexi-violet-texto"> · via Claude</span>
}
