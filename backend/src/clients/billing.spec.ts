import { billingStatus, costPerConversation, localDay, reportMessage, weekStartOf } from './billing.js';

describe('cobrança dos clientes', () => {
  it('usa o dia de Fortaleza (UTC-3)', () => {
    expect(localDay(new Date('2026-10-17T02:00:00Z'))).toBe('2026-10-16');
  });

  it('o 1º mês vence no início do contrato', () => {
    const status = billingStatus({ startDate: '2026-10-16', billingDay: 16, paidPeriods: [], today: '2026-10-16' });
    expect(status).toMatchObject({ period: '2026-10', dueDate: '2026-10-16', daysUntil: 0, overdue: false, remind: true });
  });

  it('pago o 1º mês, a renovação vence no dia de cobrança do mês seguinte', () => {
    const status = billingStatus({ startDate: '2026-10-16', billingDay: 16, paidPeriods: ['2026-10'], today: '2026-11-10' });
    expect(status).toMatchObject({ period: '2026-11', dueDate: '2026-11-16', daysUntil: 6, remind: false });
  });

  it('lembra 3 dias antes e marca atraso depois do vencimento', () => {
    const base = { startDate: '2026-10-16', billingDay: 16, paidPeriods: ['2026-10'] };
    expect(billingStatus({ ...base, today: '2026-11-13' }).remind).toBe(true);
    expect(billingStatus({ ...base, today: '2026-11-18' })).toMatchObject({ overdue: true, daysUntil: -2 });
  });

  it('dia de cobrança acima de 28 fica no 28 (existe em todo mês)', () => {
    const status = billingStatus({ startDate: '2026-01-05', billingDay: 31, paidPeriods: ['2026-01'], today: '2026-02-01' });
    expect(status.dueDate).toBe('2026-02-28');
  });
});

describe('relatório semanal', () => {
  it('acha a segunda-feira da semana', () => {
    expect(weekStartOf('2026-10-16')).toBe('2026-10-12');
    expect(weekStartOf('2026-10-12')).toBe('2026-10-12');
    expect(weekStartOf('2026-10-18')).toBe('2026-10-12');
  });

  it('calcula o custo por conversa e não divide por zero', () => {
    expect(costPerConversation(472.93, 209)).toBe(2.26);
    expect(costPerConversation(100, 0)).toBeNull();
  });

  it('monta a mensagem com os números da semana e compara com a anterior', () => {
    const message = reportMessage({
      firstName: 'Carlos',
      weekStart: '2026-10-12',
      spend: 140,
      conversations: 56,
      previous: { spend: 140, conversations: 40 },
    });
    expect(message).toContain('Oi, Carlos!');
    expect(message).toContain('(12/10 a 18/10)');
    expect(message).toContain('Conversas no WhatsApp: 56');
    expect(message).toContain('R$ 2,50');
    expect(message).toContain('mais barata que na semana anterior (R$ 3,50)');
  });
});
