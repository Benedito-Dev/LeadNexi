/** O mínimo de uma automação para decidir se um comentário a dispara */
export interface AutomationRule {
  id: string;
  /** IDs dos posts na Meta; vazio = qualquer post */
  mediaIds: string[];
  /** Palavras que disparam; vazio = qualquer comentário */
  keywords: string[];
  createdAt: Date;
}

/** Minúsculas, sem acento e com espaços simples: "QUÉRO  o Link" → "quero o link" */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A palavra (ou frase) aparece inteira no comentário: "quero" dispara em "Quero!" e em "eu QUERO
 * o link", mas não em "queroo" nem em "requero". Maiúscula e acento não contam.
 */
export function hasKeyword(comment: string, keyword: string) {
  const word = normalize(keyword);
  if (!word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(
    normalize(comment),
  );
}

/**
 * A automação que responde este comentário, ou null. Só uma responde (a Meta aceita uma resposta
 * privada por comentário): a feita para o post vence a de "qualquer post" e, entre iguais, a mais
 * nova.
 */
export function pickAutomation<T extends AutomationRule>(
  automations: T[],
  mediaId: string,
  comment: string,
): T | null {
  const matches = automations.filter(
    (a) =>
      (a.mediaIds.length === 0 || a.mediaIds.includes(mediaId)) &&
      (a.keywords.length === 0 || a.keywords.some((k) => hasKeyword(comment, k))),
  );
  matches.sort(
    (a, b) =>
      Number(b.mediaIds.length > 0) - Number(a.mediaIds.length > 0) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return matches[0] ?? null;
}
