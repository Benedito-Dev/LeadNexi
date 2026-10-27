import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { GenerateMessageDto, SuggestionFeedbackDto, SuggestReplyDto } from './dto/ai-requests.dto.js';

/** Limite por imagem da legenda; o navegador já reduz antes, para caber nos 4,5 MB da Vercel */
const MAX_CAPTION_IMAGE_BYTES = 1024 * 1024;

@ApiTags('IA')
@ApiBearerAuth()
@ApiServiceUnavailableResponse({ description: 'IA não configurada (ANTHROPIC_API_KEY) ou fora do ar' })
@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('ai/status')
  @ApiOperation({ summary: 'A IA está configurada? Qual modelo?' })
  @ApiOkResponse({ description: '{ configured, model }' })
  status() {
    return this.ai.status();
  }

  @Post('leads/:id/ai/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gera a próxima mensagem para o lead: 1 principal + 2 variações (não envia nada)' })
  @ApiOkResponse({ description: '{ suggestionId, step, options: [{ label, text, template, warnings }] }' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  message(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GenerateMessageDto) {
    return this.ai.generateMessage(id, dto);
  }

  @Post('leads/:id/ai/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Classifica a última mensagem do lead e sugere a resposta (não envia nada)' })
  @ApiOkResponse({ description: '{ suggestionId, intent, objection, warning, responsibleName, options }' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  reply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SuggestReplyDto) {
    return this.ai.suggestReply(id, dto);
  }

  @Post('leads/:id/ai/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a conversa em 3 linhas com o próximo passo e guarda no lead' })
  @ApiOkResponse({ description: '{ situation, wants, nextStep, nextStepDays, generatedAt }' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.ai.summarize(id);
  }

  @Post('leads/:id/ai/analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gera os textos da análise grátis (o usuário revisa antes de exportar)' })
  @ApiOkResponse({ description: '{ headline, findings, opportunities, reference, invitation, warnings }' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  analysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.ai.analysis(id);
  }

  @Post('ai/caption')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: MAX_CAPTION_IMAGE_BYTES } }))
  @ApiOperation({ summary: 'Escreve a legenda do post a partir das imagens (JPEG, até 10; não publica nada)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @ApiOkResponse({ description: '{ model, caption, warnings }' })
  caption(@UploadedFiles() images: { buffer: Buffer }[] | undefined) {
    return this.ai.writeCaption(images);
  }

  @Patch('ai/suggestions/:id')
  @ApiOperation({ summary: 'Registra a opção usada e/ou a avaliação (gostei / não gostei) de uma sugestão' })
  @ApiOkResponse({ description: '{ id, chosenIndex, feedback }' })
  @ApiNotFoundResponse({ description: 'Sugestão não encontrada' })
  feedback(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SuggestionFeedbackDto) {
    return this.ai.feedback(id, dto);
  }
}
