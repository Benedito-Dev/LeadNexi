import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { stableOrigin } from '../common/utils/public-origin.js';
import { CreateInstagramPostDto } from './dto/create-instagram-post.dto.js';
import {
  InstagramPostsService,
  type UploadedImage,
} from './instagram-posts.service.js';
import { InstagramPublisherService } from './instagram-publisher.service.js';

/** Limite por imagem: abaixo dos 4,5 MB que a Vercel aceita por requisição */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('instagram')
export class InstagramPostsController {
  constructor(
    private readonly posts: InstagramPostsService,
    private readonly publisher: InstagramPublisherService,
  ) {}

  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Envia uma imagem (JPEG, até 4 MB) para usar num post',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  upload(@UploadedFile() file: UploadedImage | undefined) {
    return this.posts.upload(file);
  }

  /** Imagem pelo link assinado (a tag <img> não manda o token de login; o link carrega a permissão). */
  @Public()
  @Get('media/:id')
  @Header('Cache-Control', 'private, max-age=3600')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiExcludeEndpoint()
  async media(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
  ) {
    const { stream, sizeBytes } = await this.posts.openMedia(id, token);
    return new StreamableFile(stream, {
      type: 'image/jpeg',
      length: sizeBytes,
    });
  }

  @Get('posts')
  @ApiOperation({
    summary:
      'Posts do Instagram: os que ainda não saíram (do mais próximo ao mais distante) e depois os publicados',
  })
  list() {
    return this.posts.list();
  }

  @Get('publishing')
  @ApiOperation({
    summary:
      'Publicação automática: { automatic } diz se os agendados saem sozinhos na hora marcada',
  })
  publishing() {
    return this.publisher.status();
  }

  @Post('posts')
  @ApiOperation({
    summary:
      'Agenda um post com imagens já enviadas, ou publica na hora (publishNow: a resposta traz o resultado)',
  })
  @ApiConflictResponse({ description: 'Instagram não conectado' })
  create(@Body() dto: CreateInstagramPostDto, @Req() request: Request) {
    return this.publisher.create(dto, stableOrigin(request));
  }

  @Post('posts/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Publica agora um post agendado ou tenta de novo um que falhou (a resposta traz o resultado)',
  })
  @ApiConflictResponse({ description: 'O post já foi enviado ao Instagram' })
  publish(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    return this.publisher.publishNow(id, stableOrigin(request));
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancela um post que ainda não foi publicado' })
  @ApiNoContentResponse({ description: 'Post cancelado e imagens apagadas' })
  @ApiConflictResponse({ description: 'O post já foi enviado ao Instagram' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.cancel(id);
  }
}
