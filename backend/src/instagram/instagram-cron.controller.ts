import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { CronSecretGuard } from '../common/guards/cron-secret.guard.js';
import { QstashOrCronGuard } from '../common/guards/qstash-or-cron.guard.js';
import { stableOrigin } from '../common/utils/public-origin.js';
import { InstagramPostsService } from './instagram-posts.service.js';
import { InstagramPublisherService } from './instagram-publisher.service.js';
import { InstagramService } from './instagram.service.js';

/**
 * Tarefas agendadas do Instagram: o cron diário da Vercel (ver `crons` no vercel.json) e o
 * despertador da publicação (QStash), que chama na hora de cada post.
 */
@ApiExcludeController()
@Public()
@Controller('cron')
export class InstagramCronController {
  constructor(
    private readonly instagram: InstagramService,
    private readonly posts: InstagramPostsService,
    private readonly publisher: InstagramPublisherService,
  ) {}

  /**
   * Uma vez por dia: renova o token do Instagram antes de vencer, apaga imagens enviadas que
   * nunca entraram num post e confere a publicação (interrompidas e despertador perdido). Uma
   * tarefa não impede a outra; cada uma informa o próprio resultado.
   */
  @Get('instagram-daily')
  @UseGuards(CronSecretGuard)
  async daily(@Req() request: Request) {
    return {
      tokens: await this.instagram.refreshExpiringTokens().catch(failure),
      orphanMedia: await this.posts.cleanupOrphanMedia().catch(failure),
      publishing: await this.publisher
        .maintain(stableOrigin(request))
        .catch(failure),
    };
  }

  /** Despertador (QStash): publica os posts que chegaram na hora e arma o próximo. */
  @Post('instagram-publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(QstashOrCronGuard)
  publish(@Req() request: Request) {
    return this.publisher.publishDue(stableOrigin(request));
  }
}

function failure(error: unknown) {
  return { error: error instanceof Error ? error.message : String(error) };
}
