import { createHash } from 'node:crypto';
import type { PrismaService } from '../prisma/prisma.service.js';
import { McpTokensService } from './mcp-tokens.service.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function setup(saved: { id: string; revokedAt: Date | null } | null = null) {
  const prisma = {
    mcpToken: {
      create: vi.fn().mockImplementation(({ data }: { data: { name: string } }) => Promise.resolve({ id: 'tok-1', name: data.name })),
      findUnique: vi.fn().mockResolvedValue(saved),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return { prisma, service: new McpTokensService(prisma as unknown as PrismaService) };
}

describe('McpTokensService', () => {
  it('cria o token com prefixo e guarda só o hash dele', async () => {
    const { service, prisma } = setup();
    const criado = await service.create('  Claude Code  ');

    expect(criado.token).toMatch(/^lnx_mcp_[\w-]{43}$/);
    const { data } = prisma.mcpToken.create.mock.calls[0][0];
    expect(data).toEqual({ name: 'Claude Code', tokenHash: sha256(criado.token) });
  });

  it('aceita token válido e marca o último uso', async () => {
    const { service, prisma } = setup({ id: 'tok-1', revokedAt: null });
    expect(await service.verify('lnx_mcp_abc')).toBe(true);
    expect(prisma.mcpToken.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: sha256('lnx_mcp_abc') } }));
    expect(prisma.mcpToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tok-1' } }));
  });

  it('recusa token revogado, desconhecido ou sem o prefixo', async () => {
    expect(await setup({ id: 'tok-1', revokedAt: new Date() }).service.verify('lnx_mcp_abc')).toBe(false);
    expect(await setup(null).service.verify('lnx_mcp_abc')).toBe(false);
    const { service, prisma } = setup({ id: 'tok-1', revokedAt: null });
    expect(await service.verify('outra-coisa')).toBe(false);
    expect(prisma.mcpToken.findUnique).not.toHaveBeenCalled();
  });
});
