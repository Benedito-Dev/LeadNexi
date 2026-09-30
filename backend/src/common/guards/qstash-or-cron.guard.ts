import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { checkCronSecret } from './cron-secret.guard.js';

/**
 * Rotas chamadas pelo despertador do QStash (Upstash). A chamada traz `Upstash-Signature`: um
 * JWT assinado com as chaves de assinatura do QStash (a atual ou a próxima, na troca de chaves),
 * válido só para o endereço desta rota. Sem a assinatura, vale o `Bearer <CRON_SECRET>` (cron da
 * Vercel ou teste manual). Usar junto com @Public(), já que não há usuário logado.
 *
 * O corpo não é conferido: as chamadas do despertador vão sem corpo, e a rota só dispara uma
 * tarefa que não repete trabalho (publicar o que já venceu).
 */
@Injectable()
export class QstashOrCronGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['upstash-signature'];
    if (typeof signature !== 'string') {
      checkCronSecret(this.config, request);
      return true;
    }

    const keys = [
      this.config.get<string>('QSTASH_CURRENT_SIGNING_KEY'),
      this.config.get<string>('QSTASH_NEXT_SIGNING_KEY'),
    ].filter((key): key is string => Boolean(key));
    for (const secret of keys) {
      try {
        const { sub } = await this.jwtService.verifyAsync<{ sub?: unknown }>(
          signature,
          {
            secret,
            issuer: 'Upstash',
            algorithms: ['HS256'],
            clockTolerance: 5,
          },
        );
        // A assinatura é para o endereço completo; atrás do prefixo /api o caminho termina igual
        if (
          typeof sub === 'string' &&
          new URL(sub).pathname.endsWith(request.path)
        ) {
          return true;
        }
      } catch {
        // Tenta a outra chave
      }
    }
    throw new UnauthorizedException('Assinatura do QStash inválida');
  }
}
