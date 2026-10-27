import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module.js';
import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';

@Module({
  imports: [McpModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
