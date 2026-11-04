import { hasKeyword, pickAutomation } from './automation-match.js';

describe('automação: qual comentário dispara', () => {
  describe('palavra-chave', () => {
    it('acha a palavra sem diferença de maiúscula e acento', () => {
      expect(hasKeyword('QUERO!', 'quero')).toBe(true);
      expect(hasKeyword('eu quéro o link', 'QUERO')).toBe(true);
      expect(hasKeyword('Preço?', 'preco')).toBe(true);
    });

    it('não acha pedaço de outra palavra', () => {
      expect(hasKeyword('queroo', 'quero')).toBe(false);
      expect(hasKeyword('requero', 'quero')).toBe(false);
    });

    it('aceita frase e ignora espaço a mais', () => {
      expect(hasKeyword('me   manda o   LINK por favor', 'manda o link')).toBe(true);
      expect(hasKeyword('manda link', 'manda o link')).toBe(false);
    });

    it('palavra vazia nunca dispara', () => {
      expect(hasKeyword('qualquer coisa', '  ')).toBe(false);
    });

    it('caractere especial na palavra não quebra a busca', () => {
      expect(hasKeyword('quero o e-book (grátis)', 'e-book')).toBe(true);
      expect(hasKeyword('quanto custa?', 'custa?')).toBe(true);
    });
  });

  describe('escolha da automação', () => {
    const at = (day: number) => new Date(2026, 10, day);
    const qualquer = { id: 'qualquer', mediaIds: [], keywords: [], createdAt: at(1) };
    const doPost = { id: 'post', mediaIds: ['m1'], keywords: ['quero'], createdAt: at(1) };
    const doPostNova = { id: 'nova', mediaIds: ['m1'], keywords: ['quero'], createdAt: at(3) };

    it('a do post vence a de qualquer post', () => {
      expect(pickAutomation([qualquer, doPost], 'm1', 'quero')?.id).toBe('post');
    });

    it('entre duas do mesmo post, vence a mais nova', () => {
      expect(pickAutomation([doPost, doPostNova], 'm1', 'quero')?.id).toBe('nova');
    });

    it('sem a palavra, cai na de qualquer comentário', () => {
      expect(pickAutomation([qualquer, doPost], 'm1', 'que lindo')?.id).toBe('qualquer');
    });

    it('outro post e sem automação geral: nenhuma', () => {
      expect(pickAutomation([doPost], 'm2', 'quero')).toBeNull();
    });
  });
});
