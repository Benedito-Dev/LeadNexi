import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { PipelinesModule } from './pipelines/pipelines.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    LeadsModule,
    PipelinesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
