import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

type Json = Record<string, unknown>;

/** Nome da conexão na Evolution quando EVOLUTION_INSTANCE não é definida */
const DEFAULT_INSTANCE = 'leadnexi';

/** Erro da Evolution (ou falta de resposta dela: status 0). */
export class EvolutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'EvolutionError';
  }
}

/** Situação da sessão: open = conectado, connecting = esperando o QR, close = desconectado */
export type SessionState = 'open' | 'connecting' | 'close';

export interface InstanceInfo {
  state: SessionState;
  /** JID do número conectado (5585...@s.whatsapp.net), quando conectado */
  ownerJid: string | null;
  profileName: string | null;
}

/**
 * Chamadas à Evolution API (a ponte do WhatsApp não oficial, que fica numa máquina sempre ligada).
 * Só HTTP: quem decide o que fazer é o WhatsAppService. Configurada pelas variáveis EVOLUTION_*;
 * sem elas, `configured` é falso e o canal aparece como "não configurado".
 */
@Injectable()
export class EvolutionClient {
  private readonly baseUrl: string | null;
  private readonly apiKey: string | null;
  readonly instance: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('EVOLUTION_URL')?.replace(/\/+$/, '') || null;
    this.apiKey = config.get<string>('EVOLUTION_API_KEY') || null;
    this.instance = config.get<string>('EVOLUTION_INSTANCE') || DEFAULT_INSTANCE;
  }

  get configured() {
    return this.baseUrl !== null && this.apiKey !== null;
  }

  /**
   * Token do endereço do webhook (vai na URL que a Evolution chama): derivado da chave da
   * Evolution, então só quem tem a chave sabe o endereço. `null` sem a chave.
   */
  webhookToken(): string | null {
    if (!this.apiKey) return null;
    return createHmac('sha256', this.apiKey).update('leadnexi-whatsapp-webhook').digest('hex').slice(0, 40);
  }

  /** A conexão do LeadNexi na Evolution, ou `null` se ela ainda não foi criada. */
  async findInstance(): Promise<InstanceInfo | null> {
    let body: unknown;
    try {
      body = await this.request(`/instance/fetchInstances?instanceName=${encodeURIComponent(this.instance)}`);
    } catch (error) {
      if (error instanceof EvolutionError && error.status === 404) return null;
      throw error;
    }
    const list = Array.isArray(body) ? (body as Json[]) : [];
    const item = list.find((i) => i.name === this.instance || (i.instance as Json | undefined)?.instanceName === this.instance);
    if (!item) return null;
    const status = text(item.connectionStatus) ?? text((item.instance as Json | undefined)?.status);
    return {
      state: toState(status),
      ownerJid: text(item.ownerJid),
      profileName: text(item.profileName),
    };
  }

  /** Cria a conexão já pedindo o QR code. */
  async createInstance(): Promise<void> {
    await this.request('/instance/create', {
      method: 'POST',
      body: { instanceName: this.instance, integration: 'WHATSAPP-BAILEYS', qrcode: true },
    });
  }

  /** Diz à Evolution para onde mandar as mensagens (só as novas, sem mídia em base64). */
  async setWebhook(url: string): Promise<void> {
    await this.request(`/webhook/set/${this.instance}`, {
      method: 'POST',
      body: {
        webhook: { enabled: true, url, byEvents: false, base64: false, events: ['MESSAGES_UPSERT'] },
      },
    });
  }

  /** QR code atual (imagem PNG em data URL) para ler no celular; `null` se já está conectado. */
  async connect(): Promise<string | null> {
    const body = (await this.request(`/instance/connect/${this.instance}`)) as Json;
    return text(body.base64);
  }

  /** Desconecta o celular (a conexão continua criada, pronta para um QR novo). */
  async logout(): Promise<void> {
    await this.request(`/instance/logout/${this.instance}`, { method: 'DELETE' });
  }

  /** Manda um texto. `to` é o número só com dígitos ou um JID. Devolve o ID da mensagem no WhatsApp. */
  async sendText(to: string, message: string): Promise<{ id: string; remoteJid: string | null }> {
    const body = (await this.request(`/message/sendText/${this.instance}`, {
      method: 'POST',
      body: { number: to, text: message },
    })) as Json;
    const key = (body.key ?? {}) as Json;
    const id = text(key.id);
    if (!id) throw new EvolutionError('Resposta da Evolution sem o ID da mensagem', 502);
    return { id, remoteJid: text(key.remoteJid) };
  }

  private async request(path: string, init: { method?: string; body?: unknown } = {}): Promise<unknown> {
    if (!this.baseUrl || !this.apiKey) throw new EvolutionError('Evolution não configurada', 503);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: { apikey: this.apiKey, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new EvolutionError('Sem resposta da ponte do WhatsApp', 0);
    }
    const body = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) throw new EvolutionError(errorMessage(body) ?? `Erro ${res.status} da ponte do WhatsApp`, res.status);
    return body;
  }
}

function toState(value: string | null): SessionState {
  return value === 'open' ? 'open' : value === 'connecting' ? 'connecting' : 'close';
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** A Evolution responde `{ response: { message: [...] } }` ou `{ message }` nos erros. */
function errorMessage(body: unknown): string | null {
  const b = (body ?? {}) as Json;
  const inner = (b.response ?? b) as Json;
  const message = inner.message ?? b.error;
  if (Array.isArray(message)) return message.map(String).join('; ') || null;
  return text(message);
}
