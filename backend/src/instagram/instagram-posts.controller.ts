import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { StartVideoUploadDto } from './dto/video-upload.dto.js';
import {
  QueryInstagramPostsDto,
  UpdateInstagramPostDto,
} from './dto/update-instagram-post.dto.js';
import {
  InstagramPostsService,
  type UploadedImage,
} from './instagram-posts.service.js';
import { InstagramPublisherService } from './instagram-publisher.service.js';
import { InstagramSyncService } from './instagram-sync.service.js';
import { InstagramDirectUploadService } from './instagram-direct-upload.service.js';

/** Limite por imagem: abaixo dos 4,5 MB que a Vercel aceita por requisição */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('instagram')
export class InstagramPostsController {
  constructor(
    private readonly posts: InstagramPostsService,
    private readonly publisher: InstagramPublisherService,
    private readonly sync: InstagramSyncService,
    private readonly video: InstagramDirectUploadService,
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
    const { stream, sizeBytes, contentType } = await this.posts.openMedia(id, token);
    return new StreamableFile(stream, {
      type: contentType,
      length: sizeBytes,
    });
  }

  /** Capa do vídeo de um Reel (link assinado, como a mídia). */
  @Public()
  @Get('media/:id/poster')
  @Header('Cache-Control', 'private, max-age=3600')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiExcludeEndpoint()
  async poster(@Param('id', ParseUUIDPipe) id: string, @Query('token') token: string | undefined) {
    return new StreamableFile(await this.posts.openPoster(id, token), { type: 'image/jpeg' });
  }

  @Post('media/video')
  @ApiOperation({
    summary: 'Começa o envio de um vídeo (Reel): devolve o link para o navegador mandar o arquivo direto ao armazenamento',
  })
  startVideo(@Body() dto: StartVideoUploadDto) {
    return this.video.start(dto);
  }

  /** Só no desenvolvimento (pasta local, sem bucket): a API recebe o vídeo no lugar do bucket. */
  @Public()
  @Put('media/:id/upload')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiExcludeEndpoint()
  async uploadVideoLocal(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Query('parte') parte: string | undefined,
    @Req() request: Request,
  ) {
    await this.video.receiveLocal(id, token, request, parte);
  }

  @Post('media/:id/poster')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } }))
  @ApiOperation({ summary: 'Capa do vídeo (um quadro em JPEG, tirado no navegador)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  savePoster(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: { buffer: Buffer } | undefined) {
    return this.video.savePoster(id, file);
  }

  @Post('media/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma que o vídeo terminou de subir: confere o arquivo e libera para entrar num post' })
  @ApiConflictResponse({ description: 'O arquivo não chegou ou chegou incompleto' })
  completeVideo(@Param('id', ParseUUIDPipe) id: string) {
    return this.video.complete(id);
  }

  @Get('posts')
  @ApiOperation({
    summary:
      'Posts do Instagram: os que ainda não saíram (do mais próximo ao mais distante) e depois os publicados',
  })
  list(@Query() { from, to }: QueryInstagramPostsDto) {
    if (!from !== !to) {
      throw new BadRequestException('Informe o período completo (from e to).');
    }
    return this.posts.list(
      from && to ? { from: new Date(from), to: new Date(to) } : undefined,
    );
  }

  @Get('posts/drafts')
  @ApiOperation({ summary: 'Rascunhos (posts sem data), o mais novo primeiro' })
  drafts() {
    return this.posts.drafts();
  }

  @Patch('posts/:id')
  @ApiOperation({
    summary:
      'Remarca um post agendado ou com falha (arrastar no calendário), agenda um rascunho e/ou marca um publicado como exemplo',
  })
  @ApiConflictResponse({
    description: 'O post já foi enviado (remarcar) ou não está publicado (exemplo)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstagramPostDto,
    @Req() request: Request,
  ) {
    return this.publisher.update(id, dto, stableOrigin(request));
  }

  @Post('posts/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confere os publicados com o perfil: apagado ou arquivado no Instagram vira REMOVED (e volta se reaparecer)',
  })
  syncPosts() {
    return this.sync.syncPublished();
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
      'Agenda um post com imagens já enviadas, guarda como rascunho (draft) ou publica na hora (publishNow: a resposta traz o resultado)',
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
  @ApiOperation({
    summary:
      'Cancela um post que ainda não foi publicado, ou tira da lista um removido do Instagram',
  })
  @ApiNoContentResponse({ description: 'Post apagado, com as imagens' })
  @ApiConflictResponse({ description: 'O post já foi enviado ao Instagram' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.cancel(id);
  }
}
