/**
 * Utilitários de ordenação usados pelo Kanban (etapas e cards).
 * As posições são sempre mantidas contíguas: 0, 1, 2, ...
 */

/** Insere `item` em `index` (limitado ao tamanho da lista) e retorna uma nova lista. */
export function insertAt<T>(items: readonly T[], item: T, index: number): T[] {
  const bounded = Math.max(0, Math.min(index, items.length));
  return [...items.slice(0, bounded), item, ...items.slice(bounded)];
}

/** Remove a primeira ocorrência de `item` e retorna uma nova lista. */
export function without<T>(items: readonly T[], item: T): T[] {
  return items.filter((current) => current !== item);
}

/**
 * Compara a ordem desejada com as posições atuais e retorna só o que mudou,
 * para evitar UPDATEs desnecessários.
 */
export function changedPositions(
  current: readonly { id: string; position: number }[],
  orderedIds: readonly string[],
): { id: string; position: number }[] {
  const currentById = new Map(current.map((row) => [row.id, row.position]));
  return orderedIds
    .map((id, position) => ({ id, position }))
    .filter(({ id, position }) => currentById.get(id) !== position);
}
