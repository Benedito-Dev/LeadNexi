import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  CreateAutomationDto,
  UpdateAutomationDto,
} from './dto/automation.dto.js';
import { InstagramAutomationsService } from './instagram-automations.service.js';

/** Automações do Instagram (Conteúdo › Automações): comentário num post vira mensagem no direct. */
@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('instagram/automations')
export class InstagramAutomationsController {
  constructor(private readonly automations: InstagramAutomationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Automações, a mais nova primeiro, com quantas mensagens já mandaram',
  })
  @ApiOkResponse({
    description:
      '[{ id, name, active, mediaIds, keywords, message, publicReplies, sent, failed, lastSentAt }]',
  })
  list() {
    return this.automations.list();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma automação (já ligada, salvo active: false)' })
  @ApiCreatedResponse({ description: 'Automação criada' })
  create(@Body() dto: CreateAutomationDto) {
    return this.automations.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita, liga ou pausa uma automação' })
  @ApiNotFoundResponse({ description: 'Automação não encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automations.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apaga uma automação e o registro dos disparos dela' })
  @ApiNoContentResponse({ description: 'Automação apagada' })
  @ApiNotFoundResponse({ description: 'Automação não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.automations.remove(id);
  }

  @Get(':id/runs')
  @ApiOperation({
    summary: 'Últimos 30 disparos: quem comentou, o quê, e se a mensagem saiu',
  })
  @ApiNotFoundResponse({ description: 'Automação não encontrada' })
  runs(@Param('id', ParseUUIDPipe) id: string) {
    return this.automations.runs(id);
  }
}
