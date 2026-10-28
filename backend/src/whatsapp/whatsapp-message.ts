// Leitura dos avisos da Evolution e regras de telefone do WhatsApp (funções puras, sem banco).

type Json = Record<string, unknown>;

/** Sufixo do JID de uma pessoa (o número); grupos, status e canais têm outros */
const PERSON_SUFFIX = '@s.whatsapp.net';
/** Identificador anônimo que o WhatsApp usa no lugar do número em algumas conversas */
const LID_SUFFIX = '@lid';
/** Mensagens muito longas entram cortadas no histórico */
const MAX_TEXT = 2000;

/** Mensagem sem texto: o que aparece no histórico */
const MEDIA: Record<string, string> = {
  imageMessage: 'Enviou uma imagem',
  videoMessage: 'Enviou um vídeo',
  audioMessage: 'Enviou um áudio',
  documentMessage: 'Enviou um arquivo',
  documentWithCaptionMessage: 'Enviou um arquivo',
  stickerMessage: 'Enviou uma figurinha',
  locationMessage: 'Enviou uma localização',
  liveLocationMessage: 'Enviou uma localização',
  contactMessage: 'Enviou um contato',
  contactsArrayMessage: 'Enviou contatos',
  pollCreationMessage: 'Criou uma enquete',
  pollCreationMessageV3: 'Criou uma enquete',
};

/** O que não é conversa: avisos técnicos, reações, edições, apagadas */
const NOT_CONVERSATION = new Set([
  'protocolMessage',
  'reactionMessage',
  'senderKeyDistributionMessage',
  'messageContextInfo',
  'editedMessage',
  'pollUpdateMessage',
  'keepInChatMessage',
]);

/** Mensagem do aviso `messages.upsert`, já lida */
export interface IncomingMessage {
  /** ID da mensagem no WhatsApp (não repete) */
  id: string;
  /** Enviada pelo próprio número conectado (celular, WhatsApp Web ou LeadNexi) */
  fromMe: boolean;
  /** JID da conversa: o do número quando o WhatsApp informa, senão o anônimo (@lid) */
  jid: string;
  /** Só os dígitos do número, quando se sabe (55 + DDD + número) */
  phone: string | null;
  /** Nome que a pessoa usa no WhatsApp (só nas recebidas) */
  pushName: string | null;
  text: string;
  sentAt: Date;
}

/**
 * Mensagens de um aviso da Evolution. Só `messages.upsert` de conversa com uma pessoa: grupos,
 * status, canais e avisos técnicos ficam de fora. A Evolution manda uma mensagem por aviso, mas
 * aceita também a lista (`data` como array).
 */
export function parseUpsert(payload: unknown, now = new Date()): IncomingMessage[] {
  const body = (payload ?? {}) as Json;
  const event = typeof body.event === 'string' ? body.event.toLowerCase().replace('_', '.') : '';
  if (event !== 'messages.upsert') return [];
  const items = Array.isArray(body.data) ? body.data : [body.data];
  return items.flatMap((item) => {
    const message = parseItem(item as Json | undefined, now);
    return message ? [message] : [];
  });
}

function parseItem(item: Json | undefined, now: Date): IncomingMessage | null {
  if (!item) return null;
  const key = (item.key ?? {}) as Json;
  const id = text(key.id);
  if (!id) return null;
  const jids = [key.remoteJid, key.remoteJidAlt, key.senderPn].map(text);
  const personJid = jids.find((j) => j?.endsWith(PERSON_SUFFIX)) ?? null;
  const lidJid = jids.find((j) => j?.endsWith(LID_SUFFIX)) ?? null;
  const jid = personJid ?? lidJid;
  // Grupo, status, canal ou sem conversa
  if (!jid) return null;

  const content = unwrap((item.message ?? {}) as Json);
  const described = describe(content);
  if (described === null) return null;

  return {
    id,
    fromMe: key.fromMe === true,
    jid,
    phone: personJid ? personJid.slice(0, -PERSON_SUFFIX.length).split(':')[0] : null,
    pushName: key.fromMe === true ? null : text(item.pushName),
    text: described.slice(0, MAX_TEXT),
    sentAt: toDate(item.messageTimestamp) ?? now,
  };
}

/** Mensagem temporária, "ver uma vez" e documento com legenda vêm embrulhados */
function unwrap(content: Json): Json {
  for (const wrapper of ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage']) {
    const inner = (content[wrapper] as Json | undefined)?.message as Json | undefined;
    if (inner) return unwrap(inner);
  }
  return content;
}

/** Texto da mensagem, a legenda da mídia ou o que ela é; `null` se não é conversa */
function describe(content: Json): string | null {
  const conversation = text(content.conversation);
  if (conversation) return conversation;
  const extended = text((content.extendedTextMessage as Json | undefined)?.text);
  if (extended) return extended;
  for (const [type, label] of Object.entries(MEDIA)) {
    const media = content[type] as Json | undefined;
    if (media) return text(media.caption) ?? label;
  }
  const types = Object.keys(content);
  if (types.every((t) => NOT_CONVERSATION.has(t))) return null;
  return 'Enviou uma mensagem';
}

/** Segundos desde 1970: número, texto ou o Long do protobuf (`{ low, high }`) */
function toDate(value: unknown): Date | null {
  let seconds: number | null = null;
  if (typeof value === 'number') seconds = value;
  else if (typeof value === 'string') seconds = Number(value);
  else if (value && typeof value === 'object' && typeof (value as Json).low === 'number') {
    seconds = ((value as Json).low as number) >>> 0;
  }
  return seconds && Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}

/**
 * Formas de escrever o mesmo número brasileiro, para achar o lead pelo telefone: com e sem o 55,
 * com e sem o 9 depois do DDD (o WhatsApp ainda usa o número antigo, sem o 9, em contas velhas).
 */
export function phoneVariants(digits: string): string[] {
  const national = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  const forms = new Set([national]);
  if (national.length === 10 && /^[6-9]/.test(national.slice(2))) {
    forms.add(`${national.slice(0, 2)}9${national.slice(2)}`);
  }
  if (national.length === 11 && national[2] === '9') {
    forms.add(`${national.slice(0, 2)}${national.slice(3)}`);
  }
  return [...forms].flatMap((n) => [n, `55${n}`]);
}

/** "+55 85 98812-4471" (ou só os dígitos, se não for um número brasileiro comum) */
export function formatPhone(digits: string): string {
  const match = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `+55 ${match[1]} ${match[2]}-${match[3]}` : `+${digits}`;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
