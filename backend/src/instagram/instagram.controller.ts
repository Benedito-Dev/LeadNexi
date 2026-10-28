import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Redirect,
  Req,
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
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { publicOrigin } from '../common/utils/public-origin.js';
import { QueryInsightsDto } from './dto/query-insights.dto.js';
import { SaveInstagramSettingsDto } from './dto/save-instagram-settings.dto.js';
import { InstagramInsightsService } from './instagram-insights.service.js';
import { InstagramSettingsService } from './instagram-settings.service.js';
import { InstagramService } from './instagram.service.js';

@ApiTags('Instagram')
@ApiBearerAuth()
@Controller('instagram')
export class InstagramController {
  constructor(
    private readonly instagram: InstagramService,
    private readonly settings: InstagramSettingsService,
    private readonly insights: InstagramInsightsService,
  ) {}

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

  @Get('profile')
  @ApiOperation({
    summary: 'Perfil como aparece no app, lido na hora na Meta: números, bio e os últimos posts',
  })
  @ApiOkResponse({ description: '{ connected, profile? } · connected: false sem conta válida ou com a Meta fora do ar' })
  getProfile() {
    return this.instagram.getProfileOverview();
  }

  @Get('insights')
  @ApiOperation({
    summary: 'Estatísticas do perfil (últimos 7 ou 30 dias, comparando com o período anterior) e dos últimos posts, lidas na hora na Meta',
  })
  @ApiOkResponse({
    description: '{ status: ok, days, followers, account, follows, posts } · sem-conta, sem-permissao (conectar de novo) ou falha',
  })
  getInsights(@Query() { days }: QueryInsightsDto) {
    return this.insights.getInsights(days ?? 7);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Configuração do app da Meta (sem a chave secreta)',
  })
  @ApiOkResponse({
    description:
      '{ appId, secretSaved, source, configured, redirectUri }: redirectUri é o endereço a cadastrar no app da Meta',
  })
  getSettings(@Req() request: Request) {
    return this.settings.view(publicOrigin(request));
  }

  @Put('settings')
  @ApiOperation({
    summary:
      'Salva o ID e a chave secreta do app da Meta (chave criptografada; omitida, mantém a salva)',
  })
  saveSettings(@Body() dto: SaveInstagramSettingsDto, @Req() request: Request) {
    return this.settings.save(dto, publicOrigin(request));
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gera o link do login oficial do Instagram (OAuth)',
  })
  @ApiOkResponse({ description: '{ url }: o frontend redireciona para ele' })
  @ApiServiceUnavailableResponse({
    description: 'App da Meta ainda não configurado',
  })
  connect(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.instagram.createAuthorizeUrl(user.id, publicOrigin(request));
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
    @Req() request: Request,
  ) {
    return {
      url: await this.instagram.completeConnection(
        { code, state, error },
        publicOrigin(request),
      ),
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
