import { BadRequestException } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { CreateLeadDto } from '../leads/dto/create-lead.dto.js';
import type { McpDeps } from './mcp-tools.js';

const VIA = 'claude' as const;

/** Vai para o fim da coluna (o servidor limita ao tamanho dela). */
const FIM_DA_COLUNA = 1_000_000;

/** Compara nomes de etapa sem caixa nem acento: "reuniao marcada" acha "Reunião marcada". */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

const resposta = (dados: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 1) }] });

/** Campos do lead que o Claude pode preencher (os mesmos da ficha). */
const camposDoLead = {
  nome: z.string().trim().min(1).max(120).optional().describe('Nome da loja ou da pessoa'),
  telefone: z.string().trim().max(30).optional().describe('Telefone com DDD, ex.: "85 99999-0000"'),
  email: z.email().optional(),
  instagram: z.string().trim().max(31).optional().describe('@ do Instagram, com ou sem o @'),
  origem: z.string().trim().max(60).optional().describe('De onde veio, ex.: "Instagram", "Indicação", "Planilha"'),
  responsavel: z.string().trim().max(120).optional().describe('Nome de quem decide na loja'),
  valorEstimado: z.number().min(0).max(10_000_000).optional().describe('Valor estimado do negócio, em reais'),
  observacoes: z.string().trim().max(5000).optional().describe('Observações livres sobre o lead'),
};

type CamposDoLead = { [K in keyof typeof camposDoLead]?: z.infer<(typeof camposDoLead)[K]> };

/** Campos em português (o que o Claude manda) para o formato do serviço, com as mesmas regras da tela. */
function paraDto(campos: CamposDoLead): Partial<CreateLeadDto> {
  const instagram = campos.instagram?.replace(/^@/, '').toLowerCase();
  if (instagram && !/^[a-z0-9._]{1,30}$/.test(instagram)) {
    throw new BadRequestException('O @ do Instagram tem só letras, números, ponto e sublinhado.');
  }
  const dto: Partial<CreateLeadDto> = {
    name: campos.nome,
    phone: campos.telefone,
    email: campos.email,
    instagramUsername: instagram,
    source: campos.origem,
    responsibleName: campos.responsavel,
    estimatedValue: campos.valorEstimado,
    notes: campos.observacoes,
  };
  return Object.fromEntries(Object.entries(dto).filter(([, valor]) => valor !== undefined && valor !== ''));
}

/**
 * Ferramentas que o Claude usa para agir no LeadNexi (rodada 2). Tudo o que fazem entra no
 * histórico do lead com `via = "claude"`. Nenhuma envia mensagem: o Claude prepara, a pessoa envia
 * (regra anti-banimento, docs/produto/MAPA.md, seções 3.2 e 5).
 */
export function registrarAcoes(server: McpServer, { leads, activities, pipelines }: McpDeps) {
  /** Etapa pelo nome dentro de um funil; erro com as opções, para o Claude tentar de novo. */
  const etapaPeloNome = async (nome: string, pipelineId?: string) => {
    const funis = await pipelines.findAll();
    const funil = pipelineId ? funis.find((f) => f.id === pipelineId) : funis[0];
    if (!funil) throw new BadRequestException('Nenhum funil configurado no LeadNexi.');
    const etapa = funil.stages.find((s) => normalizar(s.name) === normalizar(nome));
    if (!etapa) {
      throw new BadRequestException(`Etapa "${nome}" não existe no funil ${funil.name}. Etapas: ${funil.stages.map((s) => s.name).join(', ')}.`);
    }
    return etapa;
  };

  server.registerTool(
    'listar_etapas',
    {
      title: 'Listar etapas',
      description: 'Os funis do LeadNexi e as etapas de cada um, na ordem. Use antes de criar ou mover lead para saber os nomes certos.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const funis = await pipelines.findAll();
      return resposta(funis.map((f) => ({ id: f.id, name: f.name, stages: f.stages.map((s) => ({ name: s.name, type: s.stageType })) })));
    },
  );

  server.registerTool(
    'criar_lead',
    {
      title: 'Criar lead',
      description: 'Cadastra um lead novo no fim de uma etapa do primeiro funil (sem etapa: a primeira). Antes, confira com buscar_leads se ele já não existe.',
      inputSchema: {
        ...camposDoLead,
        nome: z.string().trim().min(1).max(120).describe('Nome da loja ou da pessoa'),
        etapa: z.string().trim().max(60).optional().describe('Nome da etapa (veja listar_etapas). Padrão: a primeira'),
      },
    },
    async ({ etapa, ...campos }) => {
      const destino = etapa ? await etapaPeloNome(etapa) : (await pipelines.findAll())[0]?.stages[0];
      if (!destino) throw new BadRequestException('Nenhuma etapa configurada no LeadNexi.');
      const lead = await leads.create({ ...paraDto(campos), name: campos.nome, stageId: destino.id } as CreateLeadDto, VIA);
      return resposta({ created: true, id: lead.id, name: lead.name, stage: lead.stage.name });
    },
  );

  server.registerTool(
    'editar_lead',
    {
      title: 'Editar lead',
      description: 'Corrige ou completa os dados de um lead (nome, telefone, e-mail, @, origem, responsável, valor, observações). Só os campos enviados mudam.',
      inputSchema: { id: z.string().uuid().describe('id do lead'), ...camposDoLead },
    },
    async ({ id, ...campos }) => {
      const dto = paraDto(campos);
      if (Object.keys(dto).length === 0) throw new BadRequestException('Informe pelo menos um campo para mudar.');
      const lead = await leads.update(id, dto, VIA);
      return resposta({ updated: Object.keys(dto), id: lead.id, name: lead.name });
    },
  );

  server.registerTool(
    'mover_lead',
    {
      title: 'Mover lead de etapa',
      description:
        'Passa o lead para outra etapa do funil dele (vai para o fim da coluna). Para uma etapa de perda, informe o motivo. Mover para uma etapa de fechamento cria a ficha de cliente.',
      inputSchema: {
        id: z.string().uuid().describe('id do lead'),
        etapa: z.string().trim().min(1).max(60).describe('Nome da etapa de destino (veja listar_etapas)'),
        motivoPerda: z.string().trim().max(120).optional().describe('Obrigatório ao mover para uma etapa de perda'),
      },
    },
    async ({ id, etapa, motivoPerda }) => {
      const atual = await leads.findOne(id);
      const destino = await etapaPeloNome(etapa, atual.stage.pipelineId);
      const lead = await leads.move(id, { stageId: destino.id, position: FIM_DA_COLUNA, lostReason: motivoPerda }, VIA);
      return resposta({ id: lead.id, name: lead.name, from: atual.stage.name, to: lead.stage.name });
    },
  );

  server.registerTool(
    'anotar',
    {
      title: 'Anotar no lead',
      description: 'Escreve uma anotação no lead (o que foi conversado, um detalhe importante). Aparece nas anotações da ficha.',
      inputSchema: {
        id: z.string().uuid().describe('id do lead'),
        texto: z.string().trim().min(1).max(5000).describe('A anotação'),
      },
    },
    async ({ id, texto }) => {
      const nota = await activities.addNote(id, { text: texto }, VIA);
      return resposta({ noted: true, leadId: id, createdAt: nota.createdAt });
    },
  );

  server.registerTool(
    'agendar_contato',
    {
      title: 'Agendar próximo contato',
      description:
        'Marca quando falar com o lead de novo (substitui o agendamento anterior). Ele aparece na tela Hoje nesse dia. O horário é de Fortaleza (UTC-03:00).',
      inputSchema: {
        id: z.string().uuid().describe('id do lead'),
        quando: z.iso.datetime({ offset: true }).describe('Data e hora com fuso, ex.: "2026-10-30T10:00:00-03:00"'),
        oQueFazer: z.string().trim().max(280).optional().describe('O que fazer nesse contato, ex.: "Mandar proposta"'),
      },
    },
    async ({ id, quando, oQueFazer }) => {
      const lead = await activities.scheduleFollowUp(id, { dueAt: quando, note: oQueFazer }, VIA);
      return resposta({ scheduled: true, id: lead.id, name: lead.name, followUpAt: lead.followUpAt });
    },
  );

  server.registerTool(
    'registrar_resposta',
    {
      title: 'Registrar resposta do lead',
      description:
        'O lead respondeu no WhatsApp: registra a resposta no histórico e passa o lead para a etapa Respondeu (ele entra em "Sua vez" na tela Hoje). Não envia nada.',
      inputSchema: {
        id: z.string().uuid().describe('id do lead'),
        texto: z.string().trim().max(5000).optional().describe('O que o lead respondeu, se souber'),
      },
    },
    async ({ id, texto }) => {
      const lead = await leads.recordWhatsAppResponse(id, { text: texto }, VIA);
      return resposta({ recorded: true, id: lead.id, name: lead.name, stage: lead.stage.name });
    },
  );
}
