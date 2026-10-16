import { normalizePhone, phoneKey } from './leads-import.service.js';

describe('normalização do importador de leads', () => {
  it('converte telefones brasileiros para E.164', () => {
    expect(normalizePhone('(85) 98777-5441')).toBe('+5585987775441');
    expect(normalizePhone('5585987775441')).toBe('+5585987775441');
    expect(normalizePhone('+55 85 3021-1055')).toBe('+558530211055');
  });

  it('considera equivalentes números com e sem o código do país', () => {
    expect(phoneKey('+5585987775441')).toBe('85987775441');
    expect(phoneKey('85 98777-5441')).toBe('85987775441');
  });

  it('recusa números que não têm DDD e telefone brasileiros', () => {
    expect(normalizePhone('98777-5441')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
});
