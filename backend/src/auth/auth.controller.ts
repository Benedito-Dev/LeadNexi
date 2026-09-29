import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { LoginDto } from './dto/login.dto.js';
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
}
