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
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AuthUserEntity, LoginResponseEntity } from './entities/auth.entity.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './refresh-cookie.js';

const MINUTE = 60_000;

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Contra força bruta: 5 tentativas por minuto por IP
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @ApiOperation({
    summary:
      'Autentica: devolve o access token e grava o refresh token em cookie httpOnly',
  })
  @ApiOkResponse({ type: LoginResponseEntity })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha inválidos' })
  @ApiTooManyRequestsResponse({
    description: 'Muitas tentativas; aguarde um minuto',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh, ...session } = await this.authService.login(dto);
    setRefreshCookie(res, refresh.token, refresh.expiresAt);
    return session;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary:
      'Renova a sessão: troca o refresh token (rotação) e devolve um access token novo',
  })
  @ApiOkResponse({ type: LoginResponseEntity })
  @ApiUnauthorizedResponse({
    description: 'Sessão ausente, expirada ou encerrada',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { refresh, ...session } = await this.authService.refresh(
        readRefreshCookie(req),
      );
      setRefreshCookie(res, refresh.token, refresh.expiresAt);
      return session;
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Encerra a sessão no servidor e apaga o cookie' })
  @ApiNoContentResponse({ description: 'Sessão encerrada' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(readRefreshCookie(req));
    clearRefreshCookie(res);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  @ApiOkResponse({ type: AuthUserEntity })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edita o nome e o e-mail de login' })
  @ApiOkResponse({ type: AuthUserEntity })
  @ApiConflictResponse({ description: 'E-mail já usado por outro usuário' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 512 * 1024, files: 1 } }))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Troca a foto de perfil (JPEG recortado no navegador, até 512 KB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ type: AuthUserEntity })
  setAvatar(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: { buffer: Buffer } | undefined) {
    return this.authService.setAvatar(user.id, file);
  }

  @Delete('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a foto de perfil (volta a inicial do nome)' })
  @ApiOkResponse({ type: AuthUserEntity })
  removeAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.removeAvatar(user.id);
  }

  /** Foto pública como a dos leads: a tag <img> não manda o token, e o ID muda a cada foto. */
  @Public()
  @Get('avatars/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiExcludeEndpoint()
  async avatar(@Param('id', ParseUUIDPipe) id: string) {
    return new StreamableFile(await this.authService.avatar(id), { type: 'image/jpeg' });
  }

  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Troca a senha (confere a atual) e encerra as outras sessões' })
  @ApiNoContentResponse({ description: 'Senha trocada' })
  @ApiBadRequestResponse({ description: 'Senha atual não confere ou nova curta demais' })
  @ApiTooManyRequestsResponse({ description: 'Tentativas demais: espere 1 minuto' })
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    await this.authService.changePassword(user.id, dto, readRefreshCookie(req));
  }
}
