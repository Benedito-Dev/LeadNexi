import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Rotas de cron (tarefas agendadas): só quem tem o CRON_SECRET chama. A Vercel envia
 * `Authorization: Bearer <CRON_SECRET>` sozinha quando a variável existe no projeto.
 * Usar junto com @Public(), já que não há usuário logado.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRON_SECRET');
    // Sem segredo configurado, ninguém chama (nem a Vercel)
    if (!secret) {
      throw new ServiceUnavailableException('CRON_SECRET não configurado');
    }
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? '';
    if (!sameText(header, `Bearer ${secret}`)) {
      throw new UnauthorizedException('Cron não autorizado');
    }
    return true;
  }
}

/** Comparação em tempo constante (não revela o segredo pelo tempo de resposta) */
function sameText(a: string, b: string) {
  const digest = (text: string) => createHash('sha256').update(text).digest();
  return timingSafeEqual(digest(a), digest(b));
}
