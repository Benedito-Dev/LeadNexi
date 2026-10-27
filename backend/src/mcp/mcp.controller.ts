import { All, Controller, HttpCode, Logger, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { stableOrigin } from '../common/utils/public-origin.js';
import { InstagramDirectUploadService } from '../instagram/instagram-direct-upload.service.js';
import { InstagramPostsService } from '../instagram/instagram-posts.service.js';
import { InstagramPublisherService } from '../instagram/instagram-publisher.service.js';
import { ClientsService } from '../clients/clients.service.js';
import { LeadActivitiesService } from '../leads/lead-activities.service.js';
import { LeadsService } from '../leads/leads.service.js';
import { PipelinesService } from '../pipelines/pipelines.service.js';
import { ResultsService } from '../results/results.service.js';
import { McpTokensService } from './mcp-tokens.service.js';
import { registrarAcoes } from './mcp-acoes.js';
import { registrarConteudo } from './mcp-conteudo.js';
import { registrarFerramentas, type McpDeps } from './mcp-tools.js';

/**
 * Servidor MCP: o Claude (Claude Code, por enquanto) consulta e age no LeadNexi por aqui. Sem sessão
 * (cada POST é independente), o que funciona igual na Vercel. Fora do login do app: entra com
 * `Authorization: Bearer <token>` gerado em Configurações › IA e Claude.
 */
@ApiExcludeController()
@Public()
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly tokens: McpTokensService,
    private readonly leads: LeadsService,
    private readonly activities: LeadActivitiesService,
    private readonly results: ResultsService,
    private readonly clients: ClientsService,
    private readonly pipelines: PipelinesService,
    private readonly posts: InstagramPostsService,
    private readonly publisher: InstagramPublisherService,
    private readonly envio: InstagramDirectUploadService,
  ) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!(await this.tokens.verify(token))) {
      throw new UnauthorizedException('Token do MCP inválido ou revogado. Gere outro em Configurações › IA e Claude.');
    }

    const server = new McpServer({ name: 'leadnexi', version: '0.1.0' });
    const deps: McpDeps = { leads: this.leads, activities: this.activities, results: this.results, clients: this.clients, pipelines: this.pipelines };
    registrarFerramentas(server, deps);
    registrarAcoes(server, deps);
    registrarConteudo(server, { posts: this.posts, publisher: this.publisher, envio: this.envio, origin: stableOrigin(req) });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error(`Falha no MCP: ${(error as Error).message}`);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Erro interno' }, id: null });
    }
  }

  /** Sem sessão: não há stream para abrir (GET) nem sessão para encerrar (DELETE). */
  @All()
  @HttpCode(405)
  semSessao() {
    return { jsonrpc: '2.0', error: { code: -32000, message: 'Método não permitido: use POST.' }, id: null };
  }
}
