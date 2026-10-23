import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateHashtagSetDto } from './dto/hashtag-set.dto.js';
import { InstagramHashtagsService } from './instagram-hashtags.service.js';
import { InstagramMessagesService } from './instagram-messages.service.js';

/** Operação do Instagram (spec F8): inbox do direct e grupos de hashtags da legenda. */
@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('instagram')
export class InstagramDirectController {
  constructor(
    private readonly messages: InstagramMessagesService,
    private readonly hashtags: InstagramHashtagsService,
  ) {}

  @Get('inbox')
  @ApiOperation({
    summary:
      'Inbox do direct: quem mandou direct (lead ou não), da conversa mais recente para a mais antiga, com a última mensagem',
  })
  @ApiOkResponse({
    description:
      '[{ id, name, instagramUsername, avatarId, archived, stageName, canReply, lastMessage }]',
  })
  inbox() {
    return this.messages.inbox();
  }

  @Get('hashtag-sets')
  @ApiOperation({ summary: 'Grupos de hashtags salvos (por nome)' })
  listHashtagSets() {
    return this.hashtags.list();
  }

  @Post('hashtag-sets')
  @ApiOperation({
    summary: 'Salva um grupo de hashtags (com ou sem #; repetidas saem)',
  })
  @ApiCreatedResponse({ description: 'Grupo salvo' })
  createHashtagSet(@Body() dto: CreateHashtagSetDto) {
    return this.hashtags.create(dto);
  }

  @Delete('hashtag-sets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apaga um grupo de hashtags' })
  @ApiNoContentResponse({ description: 'Grupo apagado' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  removeHashtagSet(@Param('id', ParseUUIDPipe) id: string) {
    return this.hashtags.remove(id);
  }
}
