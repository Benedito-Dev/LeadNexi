import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpAutomacoesDeps } from './mcp-automacoes.js';
import { registrarAutomacoes } from './mcp-automacoes.js';

type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

function setup() {
  const handlers = new Map<string, Handler>();
  const server = { registerTool: (nome: string, _c: unknown, handler: Handler) => handlers.set(nome, handler) };
  const deps = {
    automations: {
      create: vi.fn().mockResolvedValue({ id: 'a-1', active: false }),
      list: vi.fn().mockResolvedValue([
        { id: 'a-1', name: 'Link', active: true, trigger: 'COMMENT', mediaIds: [], keywords: ['quero'], message: 'Oi', buttonLabel: null, deliveryMessage: null, requireFollow: false, sent: 3, delivered: 0, failed: 1, leads: 3, won: 1, lastSentAt: null },
      ]),
    },
  };
  registrarAutomacoes(server as unknown as McpServer, deps as unknown as McpAutomacoesDeps);
  const chamar = async (nome: string, args: Record<string, unknown> = {}) => JSON.parse((await handlers.get(nome)!(args)).content[0].text);
  return { deps, chamar };
}

describe('Ferramentas de automação do MCP', () => {
  it('a automação criada pelo Claude nasce pausada', async () => {
    const { deps, chamar } = setup();
    const criada = await chamar('criar_automacao', {
      nome: 'Link',
      gatilho: 'COMMENT',
      posts: ['p1'],
      palavras: ['quero'],
      mensagem: 'Toque para receber',
      botao: 'Quero',
      entrega: 'https://x.test',
      soQuemSegue: true,
    });
    expect(deps.automations.create).toHaveBeenCalledWith({
      name: 'Link',
      active: false,
      trigger: 'COMMENT',
      mediaIds: ['p1'],
      keywords: ['quero'],
      message: 'Toque para receber',
      buttonLabel: 'Quero',
      deliveryMessage: 'https://x.test',
      requireFollow: true,
    });
    expect(criada).toMatchObject({ created: true, ligada: false });
  });

  it('lista com o placar', async () => {
    const { chamar } = setup();
    const [a] = await chamar('listar_automacoes');
    expect(a).toMatchObject({ nome: 'Link', enviadas: 3, leads: 3, fecharam: 1, falharam: 1 });
  });
});
