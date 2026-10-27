import type { Conversa, Historico } from './tipos'

// TEMPORÁRIO: conversas de WhatsApp só para ver como a tela fica quando o canal entrar (etapa 7 do
// mapa, docs/produto/MAPA.md). Aparecem só no ambiente local; saem quando o WhatsApp for de verdade.

const agora = Date.now()
const ha = (minutos: number) => new Date(agora - minutos * 60_000).toISOString()

export const CONVERSAS_DE_DEMONSTRACAO: Conversa[] = import.meta.env.DEV
  ? [
      {
        id: 'demo-wa-1',
        canal: 'whatsapp',
        name: 'Marcos Cell Center',
        instagramUsername: null,
        telefone: '+55 85 98812-4471',
        avatarId: null,
        archived: false,
        stageName: 'Respondeu',
        canReply: true,
        lastMessage: { text: 'Pode ser amanhã às 10h?', direction: 'received', createdAt: ha(8) },
      },
      {
        id: 'demo-wa-2',
        canal: 'whatsapp',
        name: 'Ótica Visão Clara',
        instagramUsername: null,
        telefone: '+55 85 3261-0090',
        avatarId: null,
        archived: false,
        stageName: 'Mensagem enviada',
        canReply: true,
        lastMessage: { text: 'Oi! Tudo bem? Me chamo Benedito, sou da Alvo Digital…', direction: 'sent', createdAt: ha(190) },
      },
    ]
  : []

export const HISTORICOS_DE_DEMONSTRACAO: Record<string, Historico> = {
  'demo-wa-1': {
    canReply: false,
    blocked: 'demo',
    replyUntil: null,
    messages: [
      { id: 'm1', direction: 'sent', text: 'Oi, bom dia! Tudo bem? Me chamo Benedito, sou da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios no Instagram pra lojas de celular.', createdAt: ha(60 * 26) },
      { id: 'm2', direction: 'received', text: 'Bom dia! Sou o Marcos, dono da loja. Pode falar comigo mesmo.', createdAt: ha(60 * 25) },
      { id: 'm3', direction: 'sent', text: 'Show, Marcos! Fiz uma análise rápida do perfil de vocês e vi 3 oportunidades. Posso te mostrar numa call de 10 minutos?', createdAt: ha(60 * 24) },
      { id: 'm4', direction: 'received', text: 'Pode sim', createdAt: ha(12) },
      { id: 'm5', direction: 'received', text: 'Pode ser amanhã às 10h?', createdAt: ha(8) },
    ],
  },
  'demo-wa-2': {
    canReply: false,
    blocked: 'demo',
    replyUntil: null,
    messages: [
      { id: 'm1', direction: 'sent', text: 'Oi! Tudo bem? Me chamo Benedito, sou da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios no Instagram e gostaria de apresentar meu trabalho pro responsável da ótica.', createdAt: ha(190) },
    ],
  },
}

export const ehDemonstracao = (id: string | null) => Boolean(id?.startsWith('demo-'))
