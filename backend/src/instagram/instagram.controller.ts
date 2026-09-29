import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { InstagramService } from './instagram.service.js';

@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagram: InstagramService) {}

  @Get('account')
  @ApiOperation({
    summary: 'Conta do Instagram conectada (ou connected: false)',
  })
  @ApiOkResponse({
    description:
      '{ connected, account? } · account.needsReconnect quando o token não vale mais',
  })
  getAccount() {
    return this.instagram.getAccount();
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gera o link do login oficial do Instagram (OAuth)',
  })
  @ApiOkResponse({ description: '{ url }: o frontend redireciona para ele' })
  @ApiServiceUnavailableResponse({
    description: 'App da Meta ainda não configurado no servidor',
  })
  connect(@CurrentUser() user: AuthenticatedUser) {
    return this.instagram.createAuthorizeUrl(user.id);
  }

  /**
   * Volta do login do Instagram (redirect_uri). Quem chama é o navegador, vindo da Meta, sem o
   * nosso token: a identidade vem do `state`. Sempre redireciona para a tela do Instagram.
   */
  @Public()
  @Get('callback')
  @Redirect()
  @ApiExcludeEndpoint()
  async callback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
  ) {
    return {
      url: await this.instagram.completeConnection({ code, state, error }),
    };
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconecta a conta do Instagram' })
  @ApiNoContentResponse({ description: 'Conta desconectada' })
  disconnect() {
    return this.instagram.disconnect();
  }
}
