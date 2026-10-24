import type { ComponentType } from 'react'
import { FileSpreadsheet, Globe, MapPin, Tag, Users } from 'lucide-react'
import { InstagramIcon, WhatsAppIcon } from '@/brand/icons'

type Icone = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>

// Ícone por canal (do LeadNexi antigo). Cor só nos canais com marca própria: Instagram em
// violeta e WhatsApp no verde do WhatsApp; o resto neutro. Origem livre cai em "Tag".
const ICONES: Record<string, { Icone: Icone; cor: string }> = {
  instagram: { Icone: InstagramIcon, cor: 'text-leadnexi-violet-texto' },
  whatsapp: { Icone: WhatsAppIcon, cor: 'text-chat-wa-accent' },
  site: { Icone: Globe, cor: 'text-muted-foreground' },
  'google maps': { Icone: MapPin, cor: 'text-muted-foreground' },
  indicação: { Icone: Users, cor: 'text-muted-foreground' },
  planilha: { Icone: FileSpreadsheet, cor: 'text-muted-foreground' },
}

/** Ícone e cor do canal de uma origem (texto livre; desconhecida cai em "Tag"). */
export function iconeDaOrigem(origem: string) {
  return ICONES[origem.trim().toLowerCase()] ?? { Icone: Tag, cor: 'text-muted-foreground' }
}
