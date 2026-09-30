import { FileSpreadsheet, Globe, Tag, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { InstagramIcon, WhatsAppIcon } from '../../../brand/icons.tsx'

type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>

// Ícone da origem do lead (BRAND.md, seção 8 · "Card de lead"). Cor só nos canais da marca:
// Instagram em violeta, WhatsApp em cyan; o resto em Slate 400. Origem livre cai em "Tag".
const SOURCE_ICONS: Record<string, { icon: Icon; color: string }> = {
  instagram: { icon: InstagramIcon, color: 'text-violet-300' },
  whatsapp: { icon: WhatsAppIcon, color: 'text-cyan' },
  site: { icon: Globe, color: 'text-slate-400' },
  indicação: { icon: Users, color: 'text-slate-400' },
  planilha: { icon: FileSpreadsheet, color: 'text-slate-400' },
}

export function SourceIcon({ source, size = 14 }: { source: string; size?: number }) {
  const { icon: Icon, color } = SOURCE_ICONS[source.toLowerCase()] ?? { icon: Tag, color: 'text-slate-400' }
  return <Icon aria-hidden size={size} strokeWidth={1.75} className={`shrink-0 ${color}`} />
}
