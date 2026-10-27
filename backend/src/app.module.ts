import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { HealthController } from './health/health.controller.js';
import { InstagramModule } from './instagram/instagram.module.js';
import { LeadListsModule } from './lead-lists/lead-lists.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { PipelinesModule } from './pipelines/pipelines.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ResultsModule } from './results/results.module.js';
import { StagesModule } from './stages/stages.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PipelinesModule,
    StagesModule,
    LeadListsModule,
    LeadsModule,
    InstagramModule,
    ResultsModule,
    AiModule,
    ClientsModule,
    McpModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: PrismaExceptionFilter }],
})
export class AppModule {}
