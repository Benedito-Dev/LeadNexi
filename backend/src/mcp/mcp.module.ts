import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { LeadsModule } from '../leads/leads.module.js';
import { PipelinesModule } from '../pipelines/pipelines.module.js';
import { ResultsModule } from '../results/results.module.js';
import { McpActionsController } from './mcp-actions.controller.js';
import { McpTokensController } from './mcp-tokens.controller.js';
import { McpTokensService } from './mcp-tokens.service.js';
import { McpController } from './mcp.controller.js';

@Module({
  imports: [LeadsModule, ResultsModule, ClientsModule, PipelinesModule],
  controllers: [McpTokensController, McpActionsController, McpController],
  providers: [McpTokensService],
})
export class McpModule {}
