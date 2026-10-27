import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMcpTokenDto } from './dto/create-mcp-token.dto.js';
import { McpTokensService } from './mcp-tokens.service.js';

@ApiTags('MCP')
@ApiBearerAuth()
@Controller('mcp/tokens')
export class McpTokensController {
  constructor(private readonly tokens: McpTokensService) {}

  @Get()
  @ApiOperation({ summary: 'Senhas de acesso do Claude (sem o token em si)' })
  @ApiOkResponse({ description: '[{ id, name, lastUsedAt, revokedAt, createdAt }]' })
  list() {
    return this.tokens.list();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma senha de acesso do Claude; o token aparece só nesta resposta' })
  @ApiCreatedResponse({ description: '{ id, name, token, createdAt, ... }' })
  create(@Body() dto: CreateMcpTokenDto) {
    return this.tokens.create(dto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoga a senha: o Claude perde o acesso na hora' })
  @ApiOkResponse({ description: '{ id, name, revokedAt, ... }' })
  @ApiNotFoundResponse({ description: 'Token não encontrado' })
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.tokens.revoke(id);
  }
}
