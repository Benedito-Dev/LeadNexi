import { addCadenceDays } from './leads.service.js';

describe('cadência de prospecção', () => {
  it('soma dois dias normalmente', () => {
    const thursday = new Date('2026-10-15T10:00:00.000Z');
    expect(addCadenceDays(thursday, 2).toISOString()).toBe('2026-10-17T10:00:00.000Z');
  });

  it('pula o domingo ao calcular o próximo contato', () => {
    const saturday = new Date('2026-10-17T10:00:00.000Z');
    expect(addCadenceDays(saturday, 1).toISOString()).toBe('2026-10-19T10:00:00.000Z');
  });

  it('preserva horário e minutos do envio', () => {
    const friday = new Date('2026-10-16T14:35:00.000Z');
    expect(addCadenceDays(friday, 3).toISOString()).toBe('2026-10-20T14:35:00.000Z');
  });
});
