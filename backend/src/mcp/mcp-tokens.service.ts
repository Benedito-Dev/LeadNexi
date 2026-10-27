import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

const PREFIX = 'lnx_mcp_';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Os campos que a tela mostra: nunca o hash. */
const tokenView = { id: true, name: true, lastUsedAt: true, revokedAt: true, createdAt: true } as const;

/**
 * Senhas de acesso do Claude ao servidor MCP. O token aparece uma vez só (ao criar); no banco
 * fica o SHA-256 dele, então um vazamento do banco não entrega o acesso.
 */
@Injectable()
export class McpTokensService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.mcpToken.findMany({ orderBy: { createdAt: 'desc' }, select: tokenView });
  }

  /** Cria e devolve o token em texto puro, junto com os dados que ficam salvos. */
  async create(name: string) {
    const token = `${PREFIX}${randomBytes(32).toString('base64url')}`;
    const saved = await this.prisma.mcpToken.create({ data: { name: name.trim(), tokenHash: hash(token) }, select: tokenView });
    return { ...saved, token };
  }

  async revoke(id: string) {
    const found = await this.prisma.mcpToken.findUnique({ where: { id }, select: { revokedAt: true } });
    if (!found) throw new NotFoundException('Token não encontrado');
    return this.prisma.mcpToken.update({
      where: { id },
      data: { revokedAt: found.revokedAt ?? new Date() },
      select: tokenView,
    });
  }

  /** Token válido (existe e não foi revogado)? Marca o último uso. */
  async verify(token: string): Promise<boolean> {
    if (!token.startsWith(PREFIX)) return false;
    const found = await this.prisma.mcpToken.findUnique({ where: { tokenHash: hash(token) }, select: { id: true, revokedAt: true } });
    if (!found || found.revokedAt) return false;
    await this.prisma.mcpToken.update({ where: { id: found.id }, data: { lastUsedAt: new Date() } });
    return true;
  }
}
