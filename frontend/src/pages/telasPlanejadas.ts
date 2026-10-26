import type { ComponentType } from 'react'
import { BarChart3, Bot, Handshake, Images, ListChecks, MessagesSquare, UserRound } from 'lucide-react'

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
  conversas: {
    icone: MessagesSquare,
    titulo: 'Conversas',
    resumo: 'Todas as mensagens num lugar só',
    etapa: 2,
    itens: [
      'Lista de conversas do Instagram e do WhatsApp, com filtro por canal e não lidas',
      'Conversa aberta com resposta e "Sugerir resposta" com IA',
      'Resumo do lead ao lado: etapa, próximo contato e "Virar lead"',
    ],
  },
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
  clientes: {
    icone: Handshake,
    titulo: 'Clientes',
    resumo: 'Quem já fechou',
    etapa: 4,
    itens: [
      'Clientes ativos com mensalidade, dia de cobrança e situação do pagamento',
      'Ficha do cliente: plano, verba, checklist de entrada, relatórios semanais e pagamentos',
      '"Gerar resumo para o cliente" a partir do relatório da semana',
    ],
  },
  conteudo: {
    icone: Images,
    titulo: 'Conteúdo',
    resumo: 'Posts do Instagram e banco de provas',
    etapa: 3,
    itens: [
      'Calendário de posts: arrastar para remarcar, lista e grade',
      'Novo post: foto ou carrossel, legenda, hashtags salvas, agendar ou publicar agora',
      'Banco de provas: resultados reais que a IA cita e o follow-up anexa',
    ],
  },
  resultados: {
    icone: BarChart3,
    titulo: 'Resultados',
    resumo: 'Placar e metas',
    etapa: 4,
    itens: [
      'Placar da semana e do mês: contatos, respostas, reuniões, fechados e faturamento',
      'Taxa de resposta por mensagem e por lista',
      'Sequência de dias batendo a meta',
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
