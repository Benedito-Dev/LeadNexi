import { changedPositions, insertAt, without } from './positions.js';

describe('positions', () => {
  describe('insertAt', () => {
    it('insere no índice informado', () => {
      expect(insertAt(['a', 'b', 'c'], 'x', 1)).toEqual(['a', 'x', 'b', 'c']);
    });

    it('limita índices fora da faixa ao fim ou ao início', () => {
      expect(insertAt(['a', 'b'], 'x', 99)).toEqual(['a', 'b', 'x']);
      expect(insertAt(['a', 'b'], 'x', -5)).toEqual(['x', 'a', 'b']);
    });

    it('não altera a lista original', () => {
      const items = ['a'];
      insertAt(items, 'x', 0);
      expect(items).toEqual(['a']);
    });
  });

  describe('without', () => {
    it('remove o item', () => {
      expect(without(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    });
  });

  describe('changedPositions', () => {
    it('retorna apenas os itens cuja posição mudou', () => {
      const current = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
      ];
      expect(changedPositions(current, ['a', 'c', 'b'])).toEqual([
        { id: 'c', position: 1 },
        { id: 'b', position: 2 },
      ]);
    });

    it('inclui itens novos na lista (sem posição atual)', () => {
      expect(changedPositions([], ['a'])).toEqual([{ id: 'a', position: 0 }]);
    });
  });
});
