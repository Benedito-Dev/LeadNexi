import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { InstagramAutomationsService } from './instagram-automations.service.js';
import { InstagramInboxService } from './instagram-inbox.service.js';

/**
 * Avisos da Meta (webhook do Instagram): direct novo vira lead, e comentário pode disparar uma
 * automação. O endereço e o token de verificação aparecem no cartão "App da Meta" da tela do
 * Instagram, para colar no app da Meta.
 */
@ApiExcludeController()
@Public()
@Controller('instagram/webhook')
export class InstagramWebhookController {
  constructor(
    private readonly inbox: InstagramInboxService,
    private readonly automations: InstagramAutomationsService,
  ) {}

  /** Cadastro na Meta ("Verificar e salvar"): devolve o `hub.challenge` se o token confere. */
  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  verify(
    @Query('hub.mode') mode: unknown,
    @Query('hub.verify_token') token: unknown,
    @Query('hub.challenge') challenge: unknown,
  ) {
    if (
      mode !== 'subscribe' ||
      typeof challenge !== 'string' ||
      !this.inbox.verifyToken(token)
    ) {
      throw new ForbiddenException('Token de verificação inválido');
    }
    return challenge;
  }

  /**
   * Aviso de mensagem ou comentário: só com a assinatura da Meta (feita com a chave secreta do
   * app). A resposta é o resumo do direct (o dos comentários fica no registro de cada automação).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: unknown,
    @Body() body: unknown,
  ) {
    if (!(await this.inbox.verifySignature(request.rawBody, signature))) {
      throw new UnauthorizedException('Assinatura da Meta inválida');
    }
    const result = await this.inbox.handle(body);
    await this.automations.handle(body);
    return result;
  }
}
