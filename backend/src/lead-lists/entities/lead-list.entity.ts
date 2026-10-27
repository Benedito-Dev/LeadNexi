export class LeadListEntity {
  id: string;
  name: string;
  niche: string | null;
  city: string | null;
  targetContacts: number | null;
  archived: boolean;
  leadCount: number;
  /** Leads da lista que já receberam mensagem (WhatsApp ou direct) */
  contacted?: number;
  /** Dos contatados, quantos responderam */
  replied?: number;
  /** Leads da lista em etapa de fechamento */
  won?: number;
  /** Regra de troca: muitos contatos e poucas respostas */
  alert?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
