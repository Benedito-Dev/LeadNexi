import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Rota que o despertador chama (ver InstagramCronController) */
export const PUBLISH_ALARM_PATH = '/api/cron/instagram-publish';
/** O plano gratuito do QStash espera no máximo 7 dias: post mais longe acorda antes e remarca */
export const MAX_ALARM_DELAY_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;
const DEFAULT_QSTASH_URL = 'https://qstash.upstash.io';

/**
 * Despertador da publicação: pede ao QStash (Upstash) que chame o LeadNexi num horário exato.
 * O banco só acorda quando há post para sair; um cron a cada minuto manteria o Neon acordado o
 * tempo todo e gastaria o limite gratuito dele. Sem QStash configurado, nada é publicado
 * sozinho (a tela avisa) e "Publicar agora" continua funcionando.
 */
@Injectable()
export class PublishAlarmService {
  private readonly logger = new Logger(PublishAlarmService.name);

  constructor(private readonly config: ConfigService) {}

  /** Dá para agendar (token) e para conferir as chamadas (chave de assinatura)? */
  get configured(): boolean {
    return Boolean(
      this.config.get<string>('QSTASH_TOKEN') &&
      (this.config.get<string>('QSTASH_CURRENT_SIGNING_KEY') ||
        this.config.get<string>('QSTASH_NEXT_SIGNING_KEY')),
    );
  }

  /**
   * Agenda uma chamada para `at` (horário já passado: agora). Devolve se conseguiu; a falha só
   * vai para o log, e o cron diário remarca o despertador.
   */
  async wakeAt(at: Date, origin: string, now = new Date()): Promise<boolean> {
    const token = this.config.get<string>('QSTASH_TOKEN');
    if (!this.configured || !token) return false;

    const target = Math.min(
      Math.max(at.getTime(), now.getTime()),
      now.getTime() + MAX_ALARM_DELAY_MS,
    );
    const notBefore = Math.ceil(target / 1000);
    const base = (
      this.config.get<string>('QSTASH_URL') || DEFAULT_QSTASH_URL
    ).replace(/\/+$/, '');

    try {
      const res = await fetch(
        `${base}/v2/publish/${origin}${PUBLISH_ALARM_PATH}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Upstash-Not-Before': String(notBefore),
            // Vários posts no mesmo horário: um despertador só
            'Upstash-Deduplication-Id': `instagram-publish-${notBefore}`,
            'Upstash-Retries': '3',
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!res.ok) {
        throw new Error(
          `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
        );
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `Despertador da publicação não agendado: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
