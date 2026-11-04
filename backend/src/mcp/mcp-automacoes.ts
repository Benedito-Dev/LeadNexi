import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { AUTOMATION_MESSAGE_LIMIT } from '../instagram/dto/automation.dto.js';
import type { InstagramAutomationsService } from '../instagram/instagram-automations.service.js';

export type McpAutomacoesDeps = { automations: InstagramAutomationsService };

const resposta = (dados: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 1) }] });

const GATILHOS = ['COMMENT', 'STORY_REPLY', 'STORY_MENTION', 'DM_KEYWORD'] as const;

/**
 * Automações do Instagram para o Claude e os agentes: ver o placar de cada uma e deixar uma pronta
 * para um post. A automação criada pelo Claude nasce **pausada**: quem liga é a pessoa, na tela
 * (Conteúdo › Automações). Mesma regra do resto do MCP: o Claude prepara, a pessoa envia.
 */
export function registrarAutomacoes(server: McpServer, { automations }: McpAutomacoesDeps) {
  server.registerTool(
    'listar_automacoes',
    {
      title: 'Listar automações do Instagram',
      description:
        'As automações (comentário, resposta ou menção no story, palavra no direct), a mais nova primeiro, com o placar: mensagens enviadas, quantos tocaram no botão, quantas pessoas alcançou (leads) e quantas delas fecharam.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      resposta(
        (await automations.list()).map((a) => ({
          id: a.id,
          nome: a.name,
          ligada: a.active,
          gatilho: a.trigger,
          posts: a.mediaIds,
          palavras: a.keywords,
          mensagem: a.message,
          botao: a.buttonLabel,
          entrega: a.deliveryMessage,
          soQuemSegue: a.requireFollow,
          enviadas: a.sent,
          tocaramNoBotao: a.delivered,
          falharam: a.failed,
          leads: a.leads,
          fecharam: a.won,
          ultimaEnviadaEm: a.lastSentAt,
        })),
      ),
  );

  server.registerTool(
    'criar_automacao',
    {
      title: 'Criar automação do Instagram (pausada)',
      description:
        'Deixa uma automação pronta, PAUSADA: só dispara depois que a pessoa ligar em Conteúdo › Automações. Ex.: quem comentar "quero" no post recebe o link no direct. Com botão, a mensagem vai com o botão e a entrega chega ao tocar. Os IDs de post são os do Instagram (ver_desempenho_posts traz os recentes).',
      inputSchema: {
        nome: z.string().min(1).max(80),
        gatilho: z.enum(GATILHOS).default('COMMENT').describe('COMMENT (comentário), STORY_REPLY, STORY_MENTION ou DM_KEYWORD (palavra no direct)'),
        posts: z.array(z.string().max(40)).max(50).default([]).describe('Só no comentário: IDs dos posts no Instagram; vazio = qualquer post'),
        palavras: z.array(z.string().max(60)).max(20).default([]).describe('Palavras que disparam; vazio = qualquer (obrigatório em DM_KEYWORD)'),
        mensagem: z.string().min(1).max(AUTOMATION_MESSAGE_LIMIT).describe('A mensagem no direct (com botão, até 640 caracteres)'),
        botao: z.string().max(20).optional().describe('Texto do botão, ex.: "Quero o link"'),
        entrega: z.string().max(AUTOMATION_MESSAGE_LIMIT).optional().describe('O que chega ao tocar no botão (obrigatório com botão)'),
        soQuemSegue: z.boolean().default(false).describe('Só entrega para quem segue a conta (precisa de botão)'),
      },
    },
    async ({ nome, gatilho, posts, palavras, mensagem, botao, entrega, soQuemSegue }) => {
      const criada = await automations.create({
        name: nome,
        active: false,
        trigger: gatilho,
        mediaIds: posts,
        keywords: palavras,
        message: mensagem,
        buttonLabel: botao ?? null,
        deliveryMessage: entrega ?? null,
        requireFollow: soQuemSegue,
      });
      return resposta({ created: true, id: criada.id, ligada: false, next: 'Peça para a pessoa revisar e ligar em Conteúdo › Automações.' });
    },
  );
}
