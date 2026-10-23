import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type * as z from 'zod/v4';

const DEFAULT_MODEL = 'claude-opus-5-5';

/**
 * Chamada ao modelo (Claude, da Anthropic). Só o backend fala com a API: a chave
 * (ANTHROPIC_API_KEY) nunca vai para o navegador. A resposta vem em JSON validado pelo schema.
 */
@Injectable()
export class AiModelService {
  private readonly logger = new Logger(AiModelService.name);
  private readonly client: Anthropic | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('ANTHROPIC_MODEL') || DEFAULT_MODEL;
    // Mensagens curtas: 1 minuto basta; uma nova tentativa automática em falha passageira
    this.client = apiKey ? new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 }) : null;
  }

  get configured(): boolean {
    return this.client !== null;
  }

  async generate<Schema extends z.ZodType>({
    system,
    context,
    task,
    schema,
  }: {
    system: string;
    /** Dados do lead, histórico e banco de provas (ver lead-context.ts) */
    context: string;
    /** O pedido do momento, ex.: "Escreva a 1ª mensagem pelo WhatsApp" */
    task: string;
    schema: Schema;
  }): Promise<z.infer<Schema>> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'A IA não está configurada. Defina ANTHROPIC_API_KEY no servidor.',
      );
    }

    let response;
    try {
      response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        // Se a Claude recusar por política, a Anthropic tenta de novo no modelo reserva indicado
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: 'user', content: `${context}\n\n<pedido>\n${task}\n</pedido>` }],
      });
    } catch (error) {
      throw this.toHttpError(error);
    }

    if (response.stop_reason === 'refusal') {
      this.logger.warn(`IA recusou o pedido (${response.stop_details?.category ?? 'sem categoria'})`);
      throw new UnprocessableEntityException('A IA não quis responder a este pedido. Escreva a mensagem à mão.');
    }
    if (!response.parsed_output) {
      this.logger.error(`Resposta da IA fora do formato (stop_reason: ${response.stop_reason})`);
      throw new BadGatewayException('A IA respondeu fora do formato esperado. Tente de novo.');
    }
    return response.parsed_output;
  }

  private toHttpError(error: unknown): HttpException {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      this.logger.error(`Chave da Anthropic recusada: ${error.message}`);
      return new ServiceUnavailableException('A chave da IA foi recusada. Confira ANTHROPIC_API_KEY.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new HttpException('A IA está com muitos pedidos agora. Tente de novo em 1 minuto.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      this.logger.error(`Sem conexão com a Anthropic: ${error.message}`);
      return new ServiceUnavailableException('Não foi possível falar com a IA. Tente de novo.');
    }
    if (error instanceof Anthropic.APIError) {
      this.logger.error(`Erro da Anthropic ${error.status}: ${error.message}`);
      return new BadGatewayException('A IA falhou ao responder. Tente de novo.');
    }
    throw error;
  }
}
