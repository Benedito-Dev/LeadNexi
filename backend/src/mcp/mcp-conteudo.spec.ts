import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpConteudoDeps } from './mcp-conteudo.js';
import { registrarConteudo } from './mcp-conteudo.js';

type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

const POST = { id: 'post-1', status: 'DRAFT', caption: 'Reel #moda', scheduledAt: null, createdAt: new Date(), images: [{ kind: 'VIDEO' }] };

function setup() {
  const handlers = new Map<string, Handler>();
  const server = { registerTool: (nome: string, _c: unknown, handler: Handler) => handlers.set(nome, handler) };
  const deps = {
    posts: { create: vi.fn().mockResolvedValue(POST), drafts: vi.fn().mockResolvedValue([POST]), list: vi.fn().mockResolvedValue([]) },
    publisher: { update: vi.fn().mockResolvedValue({ ...POST, status: 'SCHEDULED', alarmFailed: false }) },
    envio: {
      startImage: vi.fn().mockResolvedValue({ id: 'm-1', uploadUrl: '/api/instagram/media/m-1/upload?token=t', headers: { 'Content-Type': 'image/jpeg' } }),
      start: vi.fn().mockResolvedValue({ id: 'm-2', uploadUrl: 'https://bucket/video?sig', headers: {}, posterUploadUrl: 'https://bucket/capa?sig', posterHeaders: {} }),
      complete: vi.fn().mockResolvedValue({ id: 'm-1', sizeBytes: 10 }),
    },
    origin: 'https://leadnexi.vercel.app',
  };
  registrarConteudo(server as unknown as McpServer, deps as unknown as McpConteudoDeps);
  const chamar = async (nome: string, args: Record<string, unknown> = {}) => JSON.parse((await handlers.get(nome)!(args)).content[0].text);
  return { deps, chamar };
}

describe('Ferramentas de Conteúdo do MCP', () => {
  it('link de envio local vira endereço completo; o do bucket fica como veio', async () => {
    const { chamar } = setup();
    expect((await chamar('preparar_envio_de_imagem', { tamanhoBytes: 10 })).uploadUrl).toBe('https://leadnexi.vercel.app/api/instagram/media/m-1/upload?token=t');
    const video = await chamar('preparar_envio_de_video', { formato: 'mov', tamanhoBytes: 10, largura: 1080, altura: 1920, duracaoMs: 6000 });
    expect(video).toMatchObject({ videoUploadUrl: 'https://bucket/video?sig', coverUploadUrl: 'https://bucket/capa?sig' });
  });

  it('pede o vídeo no formato certo e o rascunho sem data', async () => {
    const { deps, chamar } = setup();
    await chamar('preparar_envio_de_video', { formato: 'mov', tamanhoBytes: 10, largura: 1080, altura: 1920, duracaoMs: 6000 });
    expect(deps.envio.start).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'video/quicktime', durationMs: 6000 }));
    const rascunho = await chamar('criar_rascunho_de_post', { legenda: 'Reel #moda', midias: ['m-2'] });
    expect(deps.posts.create).toHaveBeenCalledWith({ caption: 'Reel #moda', mediaIds: ['m-2'], draft: true });
    expect(rascunho).toMatchObject({ created: true, format: 'reel', status: 'DRAFT' });
  });

  it('agenda pelo publicador (que arma o despertador) com o endereço do site', async () => {
    const { deps, chamar } = setup();
    await chamar('agendar_post', { id: 'post-1', quando: '2026-10-30T19:30:00-03:00' });
    expect(deps.publisher.update).toHaveBeenCalledWith('post-1', { scheduledAt: '2026-10-30T19:30:00-03:00' }, 'https://leadnexi.vercel.app');
  });
});
