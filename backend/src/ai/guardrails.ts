// Conferência das regras de ouro depois da resposta da IA (spec F4). O prompt já proíbe; aqui o
// código confere de novo e devolve avisos para a tela. Nada é bloqueado: quem decide é o usuário.

/** Promessas de resultado proibidas (regra 3). */
const FORBIDDEN = [
  /garanti(do|da|dos|das|a|mos)\b/i,
  /\bexplodi?r?\b.{0,20}vendas/i,
  /\bmultiplic\w*.{0,25}(vendas|faturamento|clientes)/i,
  /\b\d+\s*x\s+mais\b/i,
  /\bvezes mais (vendas|clientes|faturamento)/i,
  /\bsucesso (certo|garantido)/i,
];

/** Números pequenos são livres ("10 minutos", "1º mês", "3 oportunidades"). */
const FREE_UP_TO = 10;

/** Números do texto, normalizados: "R$ 4.554,71" → "4554,71"; "2,26" → "2,26". */
export function extractNumbers(text: string): string[] {
  return (text.match(/\d[\d.,]*\d|\d/g) ?? []).map((raw) => {
    // Ponto de milhar some; vírgula decimal fica
    const cleaned = raw.replace(/[.,]$/, '');
    return /,\d{1,2}$/.test(cleaned) || !cleaned.includes(',')
      ? cleaned.replace(/\.(?=\d{3}(\D|$))/g, '')
      : cleaned.replace(/,/g, '');
  });
}

export interface GuardrailWarning {
  kind: 'number' | 'promise';
  detail: string;
}

/**
 * Confere um texto gerado. `allowedSource` é tudo de onde um número pode vir (contexto enviado ao
 * modelo: dados do lead, histórico, banco de provas e a oferta).
 */
export function checkGuardrails(text: string, allowedSource: string): GuardrailWarning[] {
  const allowed = new Set([...extractNumbers(allowedSource), '500']);
  const warnings: GuardrailWarning[] = [];

  const unknown = [...new Set(extractNumbers(text))].filter((number) => {
    const value = Number(number.replace(',', '.'));
    return !allowed.has(number) && !(Number.isInteger(value) && value <= FREE_UP_TO);
  });
  if (unknown.length) {
    warnings.push({
      kind: 'number',
      detail: `Número fora do banco de provas e dos dados do lead: ${unknown.join(', ')}. Confira antes de enviar.`,
    });
  }

  for (const pattern of FORBIDDEN) {
    const match = text.match(pattern);
    if (match) {
      warnings.push({ kind: 'promise', detail: `Parece promessa de resultado: "${match[0]}". Reescreva sem prometer.` });
    }
  }
  return warnings;
}
