// Trilha do funil (BRAND.md, seção 6.2): linha de 2px com o gradiente da marca
// e 5 nós de 14px com rótulos em Geist Mono 12px.
const RING_STEPS = [
  { label: 'Instagram', ring: 'border-stage-1' },
  { label: 'Lead', ring: 'border-stage-1' },
  { label: 'Kanban', ring: 'border-stage-2' },
  { label: 'WhatsApp', ring: 'border-stage-3' },
] as const

export function FunnelTrail({ className = '' }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Instagram, Lead, Kanban, WhatsApp e Venda"
      className={`relative ${className}`}
    >
      {/* Cada etapa tem 80px: a linha vai do centro do primeiro nó ao do último */}
      <div className="absolute top-1.5 right-10 left-10 h-0.5 bg-flow" />
      <ol className="relative flex justify-between">
        {RING_STEPS.map(({ label, ring }) => (
          <li key={label} className="flex w-20 flex-col items-center gap-3">
            <span className={`size-3.5 rounded-full border-2 bg-navy ${ring}`} />
            <span className="font-mono text-xs font-medium text-slate-400">{label}</span>
          </li>
        ))}
        <li className="flex w-20 flex-col items-center gap-3">
          <span className="size-3.5 rounded-full bg-cyan" />
          <span className="font-mono text-xs font-medium text-white">Venda</span>
        </li>
      </ol>
    </div>
  )
}
