import { describe, expect, it } from 'vitest';
import { dayKey, scoreboard } from './scoreboard.js';

const sent = (iso: string, cadenceStep: number | null = 1) => ({
  type: 'WHATSAPP_MESSAGE_SENT' as const,
  cadenceStep,
  createdAt: new Date(iso),
});

describe('scoreboard', () => {
  it('conta o dia no horário de Fortaleza, não em UTC', () => {
    // 23/10 às 22h em Fortaleza = 24/10 01h UTC
    expect(dayKey(new Date('2026-10-24T01:00:00Z'))).toBe('2026-10-23');
  });

  it('soma as ações de hoje e monta a semana de segunda a domingo', () => {
    const now = new Date('2026-10-23T15:00:00Z'); // sexta
    const rows = [
      sent('2026-10-23T12:00:00Z'),
      { type: 'FOLLOW_UP_DONE' as const, cadenceStep: null, createdAt: new Date('2026-10-23T13:00:00Z') },
      sent('2026-10-20T12:00:00Z'),
    ];
    const result = scoreboard(rows, 5, now);
    expect(result.actionsDoneToday).toBe(2);
    expect(result.week.map((day) => day.date)).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
    expect(result.week[1].firstContacts).toBe(1);
    expect(result.week[4].firstContacts).toBe(1);
  });

  it('follow-ups não contam como novo contato', () => {
    const now = new Date('2026-10-23T15:00:00Z');
    const result = scoreboard([sent('2026-10-23T12:00:00Z', 2)], 1, now);
    expect(result.week[4].firstContacts).toBe(0);
    expect(result.actionsDoneToday).toBe(1);
  });

  it('a sequência vem até ontem enquanto hoje não bateu a meta', () => {
    const now = new Date('2026-10-23T15:00:00Z');
    const rows = [sent('2026-10-21T12:00:00Z'), sent('2026-10-22T12:00:00Z')];
    expect(scoreboard(rows, 1, now).streakDays).toBe(2);
    expect(scoreboard([...rows, sent('2026-10-23T12:00:00Z')], 1, now).streakDays).toBe(3);
    expect(scoreboard([sent('2026-10-20T12:00:00Z')], 1, now).streakDays).toBe(0);
  });
});
