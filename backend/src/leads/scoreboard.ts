import type { LeadActivityType } from '../generated/prisma/client.js';

/** Fuso do usuário: os dias do placar viram à meia-noite de Fortaleza, não à do servidor (UTC). */
const TIME_ZONE = 'America/Fortaleza';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Até onde o histórico é lido para contar a sequência de dias. */
export const STREAK_WINDOW_DAYS = 60;

export const SENT_TYPES = ['WHATSAPP_MESSAGE_SENT', 'INSTAGRAM_MESSAGE_SENT'] as const;

type ActionRow = { type: LeadActivityType; cadenceStep: number | null; createdAt: Date };

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Dia (AAAA-MM-DD) no fuso do usuário. */
export function dayKey(date: Date): string {
  return dayFormat.format(date);
}

function shiftDay(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekday(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 1ª mensagem da cadência: é o que conta para a meta diária de novos contatos. */
function isFirstContact(row: ActionRow) {
  return (SENT_TYPES as readonly string[]).includes(row.type) && (row.cadenceStep === 1 || row.cadenceStep === null);
}

/**
 * Números do placar da tela Hoje, a partir do histórico real:
 * - `actionsDoneToday`: mensagens enviadas e contatos marcados como feitos hoje;
 * - `week`: 1ªs mensagens por dia, de segunda a domingo da semana atual;
 * - `month`: 1ªs mensagens por dia, do dia 1 do mês até hoje;
 * - `streakDays`: dias seguidos batendo a meta diária (hoje entra quando já bateu).
 */
export function scoreboard(rows: ActionRow[], dailyTarget: number, now: Date) {
  const today = dayKey(now);
  const firstContacts = new Map<string, number>();
  let actionsDoneToday = 0;
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    if (key === today) actionsDoneToday += 1;
    if (isFirstContact(row)) firstContacts.set(key, (firstContacts.get(key) ?? 0) + 1);
  }

  const monday = shiftDay(today, -((weekday(today) + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDay(monday, index);
    return { date, firstContacts: firstContacts.get(date) ?? 0 };
  });

  const firstOfMonth = `${today.slice(0, 8)}01`
  const month = Array.from({ length: Number(today.slice(8)) }, (_, index) => {
    const date = shiftDay(firstOfMonth, index);
    return { date, firstContacts: firstContacts.get(date) ?? 0 };
  });

  const hit = (key: string) => (firstContacts.get(key) ?? 0) >= dailyTarget;
  let cursor = hit(today) ? today : shiftDay(today, -1);
  let streakDays = 0;
  while (hit(cursor) && streakDays < STREAK_WINDOW_DAYS) {
    streakDays += 1;
    cursor = shiftDay(cursor, -1);
  }

  return { actionsDoneToday, week, month, streakDays };
}
