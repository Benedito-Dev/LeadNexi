import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { EvolutionClient, EvolutionError, type SessionState } from './evolution.client.js';
import { formatPhone } from './whatsapp-message.js';

export const SESSION_ERRORS = {
  notConfigured: 'A ponte do WhatsApp não está configurada no servidor (variáveis EVOLUTION_URL e EVOLUTION_API_KEY).',
  unreachable: 'A ponte do WhatsApp não respondeu. Confira se ela está ligada e tente de novo.',
};

/** GET /whatsapp/status */
export type WhatsAppStatus =
  | { configured: false }
  | { configured: true; reachable: false }
  | { configured: true; reachable: true; state: SessionState; phone: string | null; name: string | null };

/**
 * Sessão do WhatsApp não oficial (Evolution API): situação, QR code para conectar e desconectar.
 * Ao conectar, a Evolution é configurada para avisar cada mensagem em /api/whatsapp/webhook.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly evolution: EvolutionClient,
    private readonly config: ConfigService,
  ) {}

  async status(): Promise<WhatsAppStatus> {
    if (!this.evolution.configured) return { configured: false };
    try {
      const instance = await this.evolution.findInstance();
      if (!instance) return { configured: true, reachable: true, state: 'close', phone: null, name: null };
      const digits = instance.ownerJid?.split('@')[0]?.split(':')[0] ?? null;
      return {
        configured: true,
        reachable: true,
        state: instance.state,
        phone: instance.state === 'open' && digits ? formatPhone(digits) : null,
        name: instance.state === 'open' ? instance.profileName : null,
      };
    } catch (error) {
      this.logger.warn(`Situação do WhatsApp não lida: ${(error as Error).message}`);
      return { configured: true, reachable: false };
    }
  }

  /**
   * Prepara a conexão e devolve o QR code para ler no celular (`qr: null` se já está conectado).
   * `origin` é o endereço público do servidor: monta o endereço do webhook.
   */
  async connect(origin: string): Promise<{ state: SessionState; qr: string | null }> {
    if (!this.evolution.configured) throw new ServiceUnavailableException(SESSION_ERRORS.notConfigured);
    try {
      let instance = await this.evolution.findInstance();
      if (!instance) {
        await this.evolution.createInstance();
        instance = { state: 'connecting', ownerJid: null, profileName: null };
      }
      await this.evolution.setWebhook(this.webhookUrl(origin));
      if (instance.state === 'open') return { state: 'open', qr: null };
      return { state: 'connecting', qr: await this.evolution.connect() };
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async disconnect() {
    if (!this.evolution.configured) throw new ServiceUnavailableException(SESSION_ERRORS.notConfigured);
    try {
      await this.evolution.logout();
      this.logger.log('WhatsApp desconectado');
    } catch (error) {
      // Já desconectado: a Evolution responde erro, mas o resultado é o mesmo
      if (error instanceof EvolutionError && error.status >= 400 && error.status < 500) return;
      throw toHttpError(error);
    }
  }

  /** O aviso veio da nossa Evolution? Confere o token do endereço. */
  verifyWebhookToken(token: unknown): boolean {
    const expected = this.evolution.webhookToken();
    if (typeof token !== 'string' || !expected) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Endereço que a Evolution chama a cada mensagem. WHATSAPP_WEBHOOK_URL vale mais que o endereço
   * do site: no Mac, a Evolution (no Docker) chega ao backend por host.docker.internal.
   */
  private webhookUrl(origin: string) {
    const base = this.config.get<string>('WHATSAPP_WEBHOOK_URL') || `${origin}/api/whatsapp/webhook`;
    return `${base}?token=${this.evolution.webhookToken()}`;
  }
}

function toHttpError(error: unknown) {
  if (error instanceof EvolutionError) {
    return error.status === 0 ? new ServiceUnavailableException(SESSION_ERRORS.unreachable) : new BadGatewayException(error.message);
  }
  return error;
}
