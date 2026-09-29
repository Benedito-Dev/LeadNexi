import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { CronSecretGuard } from '../common/guards/cron-secret.guard.js';
import { InstagramService } from './instagram.service.js';

/** Tarefas agendadas do Instagram, chamadas pelo cron da Vercel (ver `crons` no vercel.json). */
@ApiExcludeController()
@Public()
@UseGuards(CronSecretGuard)
@Controller('cron')
export class InstagramCronController {
  constructor(private readonly instagram: InstagramService) {}

  /** Uma vez por dia: renova o token do Instagram antes de vencer. */
  @Get('instagram-token')
  refreshTokens() {
    return this.instagram.refreshExpiringTokens();
  }
}
