import { checkGuardrails, extractNumbers } from './guardrails.js';

const CONTEXT = `Google: nota 4,8 com 312 avaliações
- Loja de celular em Fortaleza: R$ 2,26 por conversa no WhatsApp na melhor campanha (209 conversas, R$ 472,93 investidos).
- Mesma loja: 1.200 conversas no WhatsApp em 3 campanhas, R$ 4.554,71 investidos.`;

describe('regras de ouro da IA', () => {
  it('normaliza números com milhar e decimal brasileiros', () => {
    expect(extractNumbers('R$ 4.554,71 e 1.200 conversas, nota 4,8.')).toEqual(['4554,71', '1200', '4,8']);
  });

  it('aceita números do lead, do banco de provas e o preço da oferta', () => {
    const text = 'Vi a nota 4,8 com 312 avaliações. Uma loja daqui pagou R$ 2,26 por conversa. O 1º mês sai por R$ 500.';
    expect(checkGuardrails(text, CONTEXT)).toEqual([]);
  });

  it('deixa passar números pequenos do dia a dia', () => {
    expect(checkGuardrails('Posso te mostrar em 10 minutos? São 3 pontos.', CONTEXT)).toEqual([]);
  });

  it('avisa quando aparece número que ninguém informou', () => {
    const [warning] = checkGuardrails('Nossos clientes vendem 37% a mais, com conversa a R$ 1,10.', CONTEXT);
    expect(warning.kind).toBe('number');
    expect(warning.detail).toContain('37');
    expect(warning.detail).toContain('1,10');
  });

  it('avisa sobre promessa de resultado', () => {
    const warnings = checkGuardrails('Resultado garantido: vamos explodir suas vendas!', CONTEXT);
    expect(warnings.map((warning) => warning.kind)).toEqual(['promise', 'promise']);
  });
});
