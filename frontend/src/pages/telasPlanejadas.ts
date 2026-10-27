import type { ComponentType } from 'react'
import { UserRound } from 'lucide-react'

export type TelaPlanejada = {
  icone: ComponentType<{ className?: string; strokeWidth?: number }>
  titulo: string
  resumo: string
  /** Etapa da ordem de construção em docs/produto/MAPA.md. */
  etapa: number
  itens: string[]
}

// TEMPORÁRIO: telas do mapa (docs/produto/MAPA.md) que ainda não foram construídas. Quando uma tela
// nascer de verdade, a entrada dela sai daqui.
export const TELAS_PLANEJADAS = {
  perfil: {
    icone: UserRound,
    titulo: 'Perfil',
    resumo: 'Seus dados de acesso',
    etapa: 1,
    itens: ['Nome e e-mail', 'Trocar senha', 'Tema claro ou escuro'],
  },
} satisfies Record<string, TelaPlanejada>
