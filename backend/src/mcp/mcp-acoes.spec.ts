import { BadRequestException } from '@nestjs/common';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registrarAcoes } from './mcp-acoes.js';
import type { McpDeps } from './mcp-tools.js';

type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

const FUNIL = {
  id: 'funil-1',
  name: 'Vendas',
  stages: [
    { id: 'etapa-1', name: 'A contatar', stageType: 'CONTACT' },
    { id: 'etapa-2', name: 'Reunião marcada', stageType: 'MEETING' },
  ],
};

function setup() {
  const handlers = new Map<string, Handler>();
  const server = { registerTool: (nome: string, _config: unknown, handler: Handler) => handlers.set(nome, handler) };
  const deps = {
    leads: {
      create: vi.fn().mockResolvedValue({ id: 'lead-1', name: 'Point do Celular', stage: { name: 'A contatar' } }),
      update: vi.fn().mockResolvedValue({ id: 'lead-1', name: 'Point do Celular' }),
      findOne: vi.fn().mockResolvedValue({ id: 'lead-1', stage: { name: 'A contatar', pipelineId: 'funil-1' } }),
      move: vi.fn().mockResolvedValue({ id: 'lead-1', name: 'Point do Celular', stage: { name: 'Reunião marcada' } }),
    },
    activities: { addNote: vi.fn().mockResolvedValue({ createdAt: new Date() }) },
    pipelines: { findAll: vi.fn().mockResolvedValue([FUNIL]) },
  };
  registrarAcoes(server as unknown as McpServer, deps as unknown as McpDeps);
  const chamar = (nome: string, args: Record<string, unknown>) => handlers.get(nome)!(args);
  return { deps, chamar };
}

describe('Ferramentas de ação do MCP', () => {
  it('cria o lead na primeira etapa, com os campos traduzidos e marcado via Claude', async () => {
    const { deps, chamar } = setup();
    await chamar('criar_lead', { nome: 'Point do Celular', telefone: '85 99999-0000', instagram: '@Point.Cell' });
    expect(deps.leads.create).toHaveBeenCalledWith(
      { name: 'Point do Celular', phone: '85 99999-0000', instagramUsername: 'point.cell', stageId: 'etapa-1' },
      'claude',
    );
  });

  it('move pelo nome da etapa sem ligar para acento nem caixa, para o fim da coluna', async () => {
    const { deps, chamar } = setup();
    await chamar('mover_lead', { id: 'lead-1', etapa: 'reuniao MARCADA' });
    expect(deps.leads.move).toHaveBeenCalledWith('lead-1', expect.objectContaining({ stageId: 'etapa-2', position: 1_000_000 }), 'claude');
  });

  it('etapa que não existe responde com as etapas válidas', async () => {
    const { chamar } = setup();
    await expect(chamar('mover_lead', { id: 'lead-1', etapa: 'Inventada' })).rejects.toThrow('Etapas: A contatar, Reunião marcada');
  });

  it('recusa @ inválido e edição sem nenhum campo', async () => {
    const { deps, chamar } = setup();
    await expect(chamar('editar_lead', { id: 'lead-1', instagram: 'loja teste!' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(chamar('editar_lead', { id: 'lead-1' })).rejects.toThrow('pelo menos um campo');
    expect(deps.leads.update).not.toHaveBeenCalled();
  });

  it('anota marcando via Claude', async () => {
    const { deps, chamar } = setup();
    await chamar('anotar', { id: 'lead-1', texto: 'Pediu pra voltar sexta' });
    expect(deps.activities.addNote).toHaveBeenCalledWith('lead-1', { text: 'Pediu pra voltar sexta' }, 'claude');
  });
});
