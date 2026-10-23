// Monta o contexto que vai para o modelo: dados do lead, histórico, banco de provas e o momento
// (saudação no horário de Fortaleza). Função pura, sem banco, para dar para testar.

export const TIME_ZONE = 'America/Fortaleza';

/** Quantos eventos do histórico entram no contexto (os mais recentes). */
export const HISTORY_LIMIT = 40;

export interface ContextLead {
  name: string;
  phone: string | null;
  phoneType: string | null;
  neighborhood: string | null;
  address: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  isNetwork: boolean;
  adStatus: string | null;
  cadenceStep: number | null;
  responsibleName: string | null;
  instagramUsername: string | null;
  notes: string | null;
  lostReason: string | null;
  stage: { name: string; stageType: string };
  list: { name: string } | null;
}

export interface ContextActivity {
  type: string;
  text: string | null;
  fromStage: string | null;
  toStage: string | null;
  channel: string | null;
  cadenceStep: number | null;
  createdAt: Date;
}

export interface ContextProof {
  text: string;
  source: string;
  referenceDate: string | null;
  canNameClient: boolean;
}

/** "Bom dia" até 12h, "Boa tarde" até 18h, depois "Boa noite" (horário de Fortaleza). */
export function greetingAt(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(now),
  );
  return hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite';
}

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const AD_STATUS: Record<string, string> = {
  anuncia: 'sim, anuncia no Meta',
  nao: 'não anuncia',
  nao_verificado: 'não verificado',
};

const PHONE_TYPE: Record<string, string> = {
  celular: 'celular',
  fixo: 'fixo (talvez sem WhatsApp)',
  desconhecido: 'não sabemos',
};

function describeActivity(activity: ContextActivity): string | null {
  const text = activity.text?.trim();
  switch (activity.type) {
    case 'CREATED':
      return `Lead criado${activity.toStage ? ` em "${activity.toStage}"` : ''}`;
    case 'STAGE_CHANGED':
      return `Movido de "${activity.fromStage ?? '—'}" para "${activity.toStage ?? '—'}"`;
    case 'NOTE':
      return text ? `Anotação do Benedito: ${text}` : null;
    case 'FOLLOW_UP_SCHEDULED':
      return `Próximo contato agendado${text ? `: ${text}` : ''}`;
    case 'FOLLOW_UP_DONE':
      return `Contato marcado como feito${text ? `: ${text}` : ''}`;
    case 'INSTAGRAM_MESSAGE':
      return `LEAD no Direct: ${text ?? '(sem texto)'}`;
    case 'INSTAGRAM_MESSAGE_SENT':
      return `BENEDITO no Direct: ${text ?? '(sem texto)'}`;
    case 'WHATSAPP_MESSAGE_SENT':
      return `BENEDITO no WhatsApp${activity.cadenceStep ? ` (passo ${activity.cadenceStep} da cadência)` : ''}: ${text ?? '(sem texto)'}`;
    case 'WHATSAPP_MESSAGE_RECEIVED':
      return `LEAD no WhatsApp: ${text ?? '(respondeu; texto não registrado)'}`;
    default:
      return null;
  }
}

/** Histórico do mais antigo para o mais novo (o modelo lê como uma conversa). */
export function historyLines(activities: ContextActivity[]): string[] {
  return [...activities]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(-HISTORY_LIMIT)
    .flatMap((activity) => {
      const line = describeActivity(activity);
      return line ? [`[${formatWhen(activity.createdAt)}] ${line}`] : [];
    });
}

export function proofLines(proofs: ContextProof[]): string[] {
  return proofs.map(
    (proof) =>
      `- ${proof.text} (fonte: ${proof.source}${proof.referenceDate ? `, ${proof.referenceDate}` : ''}; ${
        proof.canNameClient ? 'pode citar o nome da loja' : 'não citar o nome da loja'
      })`,
  );
}

export function buildLeadContext({
  lead,
  activities,
  proofs,
  now,
}: {
  lead: ContextLead;
  activities: ContextActivity[];
  proofs: ContextProof[];
  now: Date;
}): string {
  const google =
    lead.googleRating !== null
      ? `nota ${lead.googleRating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${
          lead.googleReviewCount !== null ? ` com ${lead.googleReviewCount} avaliações` : ''
        }`
      : 'sem dados';
  const fields: [string, string | null][] = [
    ['Loja', lead.name],
    ['Lista', lead.list?.name ?? null],
    ['Bairro', lead.neighborhood],
    ['Endereço', lead.address],
    ['Google', google],
    ['Anuncia no Meta', lead.adStatus ? (AD_STATUS[lead.adStatus] ?? lead.adStatus) : 'não verificado'],
    ['É rede de lojas', lead.isNetwork ? 'sim' : 'não'],
    ['Responsável', lead.responsibleName ?? 'ainda não sabemos quem decide'],
    ['Telefone', lead.phone ? (lead.phoneType ? PHONE_TYPE[lead.phoneType] ?? lead.phoneType : 'tipo não informado') : 'sem telefone'],
    ['Instagram', lead.instagramUsername ? `@${lead.instagramUsername}` : null],
    ['Etapa no funil', lead.stage.name],
    ['Mensagens da cadência já enviadas', String(lead.cadenceStep ?? 0)],
    ['Motivo de perda', lead.lostReason],
    ['Observações', lead.notes],
  ];
  const history = historyLines(activities);
  const proofList = proofLines(proofs);

  return [
    `<agora>${formatWhen(now)} (Fortaleza). Saudação: ${greetingAt(now)}.</agora>`,
    '<lead>',
    ...fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    '</lead>',
    '<historico>',
    ...(history.length ? history : ['(nada registrado ainda)']),
    '</historico>',
    '<banco_de_provas>',
    ...(proofList.length ? proofList : ['(vazio: não cite nenhum resultado)']),
    '</banco_de_provas>',
  ].join('\n');
}
