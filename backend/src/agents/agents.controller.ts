import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { McpTokensService } from '../mcp/mcp-tokens.service.js';
import { AgentsService } from './agents.service.js';
import { FinishAgentRunDto, StartAgentRunDto } from './dto/agent-run.dto.js';

@ApiTags('Escritório')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly tokens: McpTokensService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Agentes do Escritório com a última execução e a próxima' })
  @ApiOkResponse({ description: '[{ id, slug, name, role, scheduleTime, character, lastRun, nextRunAt }]' })
  list() {
    return this.agents.list();
  }

  @Get(':id/runs')
  @ApiOperation({ summary: 'Últimas 20 execuções de um agente' })
  @ApiNotFoundResponse({ description: 'Agente não encontrado' })
  runs(@Param('id', ParseUUIDPipe) id: string) {
    return this.agents.runs(id);
  }

  /** Chamado pelo agente na VPS ao acordar (senha do MCP no cabeçalho, como no /mcp). */
  @Public()
  @Post('runs')
  @ApiOperation({ summary: 'O agente avisa que acordou (Authorization: Bearer lnx_mcp_…)' })
  async start(@Req() req: Request, @Body() dto: StartAgentRunDto) {
    await this.checkAgentToken(req);
    return this.agents.start(dto.agent);
  }

  @Public()
  @Patch('runs/:id')
  @ApiOperation({ summary: 'O agente avisa que terminou, com o resultado (Authorization: Bearer lnx_mcp_…)' })
  async finish(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: FinishAgentRunDto) {
    await this.checkAgentToken(req);
    return this.agents.finish(id, dto);
  }

  private async checkAgentToken(req: Request) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!(await this.tokens.verify(token))) {
      throw new UnauthorizedException('Senha do agente inválida ou revogada. Gere outra em Configurações › IA e Claude.');
    }
  }
}
