import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { ClientsService } from '../clients/clients.service.js';
import type { LeadActivitiesService } from '../leads/lead-activities.service.js';
import type { LeadsService } from '../leads/leads.service.js';
import type { ResultsService } from '../results/results.service.js';

export type McpDeps = {
  leads: LeadsService;
  activities: LeadActivitiesService;
  results: ResultsService;
  clients: ClientsService;
};

type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  instagramUsername: string | null;
  source: string | null;
  followUpAt: Date | null;
  stage: { name: string };
};

/** Só o que o Claude precisa para falar do lead: menos texto, menos tokens. */
const resumoDoLead = (lead: LeadRow) => ({
  id: lead.id,
  name: lead.name,
  stage: lead.stage.name,
  phone: lead.phone,
  instagram: lead.instagramUsername ? `@${lead.instagramUsername}` : null,
  source: lead.source,
  followUpAt: lead.followUpAt,
});

const resposta = (dados: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 1) }] });

/**
 * Ferramentas que o Claude usa para consultar o LeadNexi (rodada 1: só leitura). Chamam os
 * mesmos serviços das telas: nenhuma regra de negócio duplicada (docs/produto/MAPA.md, seção 5).
 */
export function registrarFerramentas(server: McpServer, { leads, activities, results, clients }: McpDeps) {
  server.registerTool(
    'ver_hoje',
    {
      title: 'Ver o dia',
      description:
        'A tela Hoje do LeadNexi: meta do dia e quantas ações já foram feitas, e a fila de leads para agir (respostas para responder, follow-ups vencidos, novas lojas para a 1ª mensagem e compromissos). Use para "o que eu tenho pra hoje?".',
      inputSchema: {},
    },
    async () => {
      const dia = await activities.todayDashboard();
      return resposta({
        dailyTarget: dia.dailyTarget,
        actionsDoneToday: dia.actionsDoneToday,
        streakDays: dia.streakDays,
        respondThese: dia.responses.map(resumoDoLead),
        followUpsDue: dia.followUps.filter((lead) => lead.followUpAt && lead.followUpAt <= new Date()).map(resumoDoLead),
        newStoresToContact: dia.newContacts.map(resumoDoLead),
        meetings: dia.meetings.map((lead) => ({ ...resumoDoLead(lead), meetingAt: lead.meetingAt })),
        week: { contactsMade: dia.contactsMade, responses: dia.responsesThisWeek, meetings: dia.meetingsThisWeek },
      });
    },
  );

  server.registerTool(
    'buscar_leads',
    {
      title: 'Buscar leads',
      description: 'Procura leads por nome, telefone, e-mail ou @ do Instagram. Sem busca, traz os mais recentes. Devolve o id de cada um (use em ver_lead).',
      inputSchema: {
        busca: z.string().max(120).optional().describe('Nome, telefone, e-mail ou @'),
        limite: z.number().int().min(1).max(50).optional().describe('Quantos trazer (padrão 20)'),
      },
    },
    async ({ busca, limite }) => {
      const { data, meta } = await leads.findAll({ search: busca?.trim() || undefined, page: 1, limit: limite ?? 20 });
      return resposta({ total: meta.total, leads: data.map(resumoDoLead) });
    },
  );

  server.registerTool(
    'ver_lead',
    {
      title: 'Ver um lead',
      description: 'Dados completos de um lead e o histórico dele (mensagens, anotações, mudanças de etapa), do mais novo para o mais antigo.',
      inputSchema: { id: z.string().uuid().describe('id do lead (vem de buscar_leads ou ver_hoje)') },
    },
    async ({ id }) => {
      const [lead, historico] = await Promise.all([leads.findOne(id), activities.list(id)]);
      return resposta({
        ...lead,
        history: historico.map(({ type, text, channel, fromStage, toStage, dueAt, createdAt }) => ({ type, text, channel, fromStage, toStage, dueAt, createdAt })),
      });
    },
  );

  server.registerTool(
    'ver_resultados',
    {
      title: 'Ver resultados',
      description:
        'O placar da semana e do mês: contatados, responderam, reuniões, propostas, fechados e faturamento (com as taxas), sequência de dias batendo a meta e desempenho de cada mensagem.',
      inputSchema: {},
    },
    async () => {
      const { settings, ...placar } = await results.getDashboard();
      return resposta({
        goals: { dailyTarget: settings.dailyTarget, weeklyTarget: settings.weeklyTarget, monthlyRevenueGoal: settings.monthlyRevenueGoal },
        ...placar,
      });
    },
  );

  server.registerTool(
    'listar_clientes',
    {
      title: 'Listar clientes',
      description: 'Clientes que fecharam: plano, mensalidade, situação da cobrança e os totais de gasto e conversas dos relatórios semanais.',
      inputSchema: {},
    },
    async () => {
      const lista = await clients.list();
      return resposta(
        lista.map(({ id, lead, status, plan, monthlyFee, billingDay, billing, totals }) => ({
          id,
          name: lead.name,
          status,
          plan,
          monthlyFee,
          billingDay,
          billing,
          totals,
        })),
      );
    },
  );
}
