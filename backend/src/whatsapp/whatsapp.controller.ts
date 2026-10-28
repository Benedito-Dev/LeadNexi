import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { publicOrigin } from '../common/utils/public-origin.js';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto.js';
import { WhatsAppInboxService } from './whatsapp-inbox.service.js';
import { WhatsAppMessagesService } from './whatsapp-messages.service.js';
import { WhatsAppService } from './whatsapp.service.js';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly inbox: WhatsAppInboxService,
    private readonly messages: WhatsAppMessagesService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Situação do WhatsApp: ponte configurada, no ar, conectado (open), esperando o QR (connecting) ou desconectado (close)' })
  status() {
    return this.whatsapp.status();
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prepara a conexão e devolve o QR code (imagem em data URL) para ler no celular' })
  @ApiOkResponse({ description: '{ state, qr } · qr null quando já está conectado' })
  @ApiServiceUnavailableResponse({ description: 'Ponte não configurada ou fora do ar' })
  connect(@Req() request: Request) {
    return this.whatsapp.connect(publicOrigin(request));
  }

  @Delete('session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconecta o celular' })
  @ApiNoContentResponse({ description: 'Desconectado' })
  disconnect() {
    return this.whatsapp.disconnect();
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Conversas do WhatsApp, da mensagem mais recente para a mais antiga' })
  conversations() {
    return this.messages.inbox();
  }

  /** Avisos da Evolution (cada mensagem nova). Quem chama é a ponte: a permissão vem do token do endereço. */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async webhook(@Query('token') token: unknown, @Body() payload: unknown) {
    if (!this.whatsapp.verifyWebhookToken(token)) throw new ForbiddenException();
    return this.inbox.handle(payload);
  }
}

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('leads/:id/whatsapp')
export class WhatsAppConversationController {
  constructor(private readonly messages: WhatsAppMessagesService) {}

  @Get('conversation')
  @ApiOperation({ summary: 'Conversa do WhatsApp com o lead (as últimas 200 mensagens) e se dá para responder agora' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  conversation(@Param('id', ParseUUIDPipe) id: string) {
    return this.messages.conversation(id);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Manda um texto no WhatsApp para o lead (um por vez, pelo número conectado)' })
  @ApiBadRequestResponse({ description: 'Mensagem vazia ou longa demais' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  @ApiConflictResponse({ description: 'Lead sem conversa no WhatsApp ou WhatsApp desconectado' })
  @ApiBadGatewayResponse({ description: 'O WhatsApp recusou' })
  @ApiServiceUnavailableResponse({ description: 'A ponte do WhatsApp não respondeu' })
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendWhatsAppMessageDto) {
    return this.messages.send(id, dto.text);
  }
}
