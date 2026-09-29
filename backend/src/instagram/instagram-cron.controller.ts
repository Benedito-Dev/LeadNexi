import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { CronSecretGuard } from '../common/guards/cron-secret.guard.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramService } from './instagram.service.js';

/** Tarefas agendadas do Instagram, chamadas pelo cron da Vercel (ver `crons` no vercel.json). */
@ApiExcludeController()
@Public()
@UseGuards(CronSecretGuard)
@Controller('cron')
export class InstagramCronController {
  constructor(
    private readonly instagram: InstagramService,
    private readonly posts: InstagramPostsService,
  ) {}

  /**
   * Uma vez por dia: renova o token do Instagram antes de vencer e apaga imagens enviadas que
   * nunca entraram num post. Uma tarefa não impede a outra; cada uma informa o próprio resultado.
   */
  @Get('instagram-daily')
  async daily() {
    return {
      tokens: await this.instagram.refreshExpiringTokens().catch(failure),
      orphanMedia: await this.posts.cleanupOrphanMedia().catch(failure),
    };
  }
}

function failure(error: unknown) {
  return { error: error instanceof Error ? error.message : String(error) };
}
