import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadActivitiesService } from '../leads/lead-activities.service.js';

@ApiTags('MCP')
@ApiBearerAuth()
@Controller('mcp/actions')
export class McpActionsController {
  constructor(private readonly activities: LeadActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Últimas 20 ações feitas pelo Claude (também ficam no histórico de cada lead)' })
  @ApiOkResponse({ description: '[{ id, type, text, toStage, dueAt, createdAt, lead: { id, name } }]' })
  list() {
    return this.activities.listByVia('claude');
  }
}
