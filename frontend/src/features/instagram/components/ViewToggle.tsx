import { LayoutGrid, List } from 'lucide-react'
import type { PostView } from '../view.ts'

const OPTIONS = [
  { value: 'lista', label: 'Ver em lista', icon: List },
  { value: 'grade', label: 'Ver em grade', icon: LayoutGrid },
] as const

// Alterna a lista de posts entre lista e grade (BRAND.md, seção 9.5): dois ícones num seletor
// Navy 750; o escolhido fica em Navy 800 com ícone branco.
export function ViewToggle({ view, onChange }: { view: PostView; onChange: (view: PostView) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Visualização dos posts"
      className="inline-flex gap-0.5 rounded-md border bg-navy-750 p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={`grid size-8 cursor-pointer place-items-center rounded-sm transition-colors ${
            view === value ? 'bg-navy-800 text-white' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Icon aria-hidden size={18} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  )
}
