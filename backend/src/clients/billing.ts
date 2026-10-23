// Regras de cobrança e do relatório semanal dos clientes (spec F9). Funções puras, com datas do
// dia no horário de Fortaleza ("2026-10-16"), para dar para testar sem banco nem relógio.

const TIME_ZONE = 'America/Fortaleza';

/** Avisar da renovação com esta antecedência (dias) */
export const RENEWAL_NOTICE_DAYS = 3;

/** Dia de hoje em Fortaleza: "2026-10-16" */
export function localDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Dias corridos de `from` até `to` (negativo: já passou) */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** Segunda-feira da semana do dia: "2026-10-16" (sexta) → "2026-10-12" */
export function weekStartOf(day: string): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return formatDay(date);
}

function addMonths(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

export interface BillingStatus {
  /** Mês a pagar, ex.: "2026-11" */
  period: string;
  /** Vencimento: "2026-11-16" */
  dueDate: string;
  /** Dias até o vencimento (negativo: atrasado) */
  daysUntil: number;
  overdue: boolean;
  /** Vence em até 3 dias (ou já venceu): hora de lembrar */
  remind: boolean;
}

/**
 * Próxima cobrança: o primeiro mês, desde o início, que ainda não tem pagamento registrado. Vence
 * no dia de cobrança daquele mês (o 1º mês vence no início do contrato).
 */
export function billingStatus({
  startDate,
  billingDay,
  paidPeriods,
  today,
}: {
  startDate: string;
  billingDay: number;
  paidPeriods: string[];
  today: string;
}): BillingStatus {
  const paid = new Set(paidPeriods);
  let period = startDate.slice(0, 7);
  while (paid.has(period)) period = addMonths(period, 1);

  const day = String(Math.min(Math.max(billingDay, 1), 28)).padStart(2, '0');
  // No mês de início, vence no próprio início (quem fecha dia 20 não paga dia 5 do mesmo mês)
  const dueDate = period === startDate.slice(0, 7) && startDate.slice(8) > day ? startDate : `${period}-${day}`;
  const daysUntil = daysBetween(today, dueDate);
  return { period, dueDate, daysUntil, overdue: daysUntil < 0, remind: daysUntil <= RENEWAL_NOTICE_DAYS };
}

/** "R$ 2,50" com espaço comum (o Intl usa espaço não separável, que fica estranho colado no WhatsApp) */
const money = (value: number) =>
  value
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
    .replace(/\u00a0/g, ' ');

/** Custo por conversa (gasto ÷ conversas); sem conversa, null */
export function costPerConversation(spend: number, conversations: number): number | null {
  return conversations > 0 ? Math.round((spend / conversations) * 100) / 100 : null;
}

/**
 * Mensagem-resumo da semana para mandar ao cliente. Só números registrados; compara com a semana
 * anterior quando houver. Nada de promessa (regras de ouro da spec).
 */
export function reportMessage({
  firstName,
  weekStart,
  spend,
  conversations,
  previous,
}: {
  firstName: string | null;
  weekStart: string;
  spend: number;
  conversations: number;
  previous?: { spend: number; conversations: number } | null;
}): string {
  const start = parseDay(weekStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const label = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const cost = costPerConversation(spend, conversations);

  const lines = [
    `Oi${firstName ? `, ${firstName}` : ''}! Resumo dos anúncios da semana (${label(start)} a ${label(end)}):`,
    '',
    `💰 Investido: ${money(spend)}`,
    `💬 Conversas no WhatsApp: ${conversations}`,
    cost !== null ? `📊 Custo por conversa: ${money(cost)}` : '📊 Sem conversas nesta semana',
  ];

  const previousCost = previous ? costPerConversation(previous.spend, previous.conversations) : null;
  if (cost !== null && previousCost !== null && previousCost !== cost) {
    lines.push(
      '',
      cost < previousCost
        ? `Cada conversa saiu ${money(previousCost - cost)} mais barata que na semana anterior (${money(previousCost)}).`
        : `Cada conversa saiu ${money(cost - previousCost)} mais cara que na semana anterior (${money(previousCost)}). Vou ajustar os anúncios pra próxima semana.`,
    );
  }
  lines.push('', 'Lembrando: conversa é quem chamou no WhatsApp pelo anúncio. Qualquer dúvida, me chama!');
  return lines.join('\n');
}
