import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LeadActivityEntity } from '../leads/entities/lead-activity.entity.js';
import { SendInstagramMessageDto } from './dto/send-instagram-message.dto.js';
import { InstagramMessagesService } from './instagram-messages.service.js';

@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('leads/:id/instagram')
export class InstagramMessagesController {
  constructor(private readonly messages: InstagramMessagesService) {}

  @Post('messages')
  @ApiOperation({
    summary:
      'Manda um texto no direct para o lead (só quem já mandou direct, até 24 h depois da última mensagem dele)',
  })
  @ApiCreatedResponse({
    type: LeadActivityEntity,
    description: 'Mensagem enviada, já no histórico do lead',
  })
  @ApiBadRequestResponse({ description: 'Mensagem vazia ou longa demais' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  @ApiConflictResponse({
    description:
      'Lead sem direct, janela de 24 h fechada, conexão expirada ou pessoa indisponível',
  })
  @ApiBadGatewayResponse({
    description: 'O Instagram recusou ou não respondeu',
  })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendInstagramMessageDto,
  ) {
    return this.messages.send(id, dto.text);
  }
}
