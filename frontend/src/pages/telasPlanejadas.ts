import type { ComponentType } from 'react'
import { Bot, ListChecks, UserRound } from 'lucide-react'

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
  listas: {
    icone: ListChecks,
    titulo: 'Listas',
    resumo: 'Nichos e listas de prospecção',
    etapa: 8,
    itens: [
      'Quantos leads em cada lista, quantos contatados e quantos responderam',
      'Aviso da regra: 30 contatados e menos de 2 respostas, troque o nicho ou a mensagem',
      'Importar planilha e, no futuro, gerar lista pelo Google Maps',
    ],
  },
  perfil: {
    icone: UserRound,
    titulo: 'Perfil',
    resumo: 'Seus dados de acesso',
    etapa: 1,
    itens: ['Nome e e-mail', 'Trocar senha', 'Tema claro ou escuro'],
  },
  ia: {
    icone: Bot,
    titulo: 'IA e Claude',
    resumo: 'Inteligência artificial e conexão com o seu Claude',
    etapa: 6,
    itens: [
      'Situação da IA e o modelo usado',
      'MCP: endereço, gerar e revogar o token do Claude',
      'Últimas ações feitas pelo Claude (tudo também fica no histórico do lead)',
    ],
  },
} satisfies Record<string, TelaPlanejada>
