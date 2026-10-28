import { buildLeadContext, greetingAt, type ContextLead } from './lead-context.js';

const LEAD: ContextLead = {
  name: 'Mikkis Tech',
  phone: '+5585987775441',
  phoneType: 'celular',
  neighborhood: 'Aldeota',
  address: null,
  googleRating: 4.8,
  googleReviewCount: 312,
  isNetwork: false,
  adStatus: 'anuncia',
  cadenceStep: 1,
  responsibleName: null,
  instagramUsername: 'mikkistech',
  notes: null,
  lostReason: null,
  stage: { name: 'Mensagem enviada', stageType: 'SENT' },
  list: { name: 'Lojas de celular · Fortaleza' },
};

describe('contexto do lead para a IA', () => {
  it('escolhe a saudação pelo horário de Fortaleza (UTC-3)', () => {
    expect(greetingAt(new Date('2026-10-16T11:00:00Z'))).toBe('bom dia'); // 8h
    expect(greetingAt(new Date('2026-10-16T17:00:00Z'))).toBe('boa tarde'); // 14h
    expect(greetingAt(new Date('2026-10-16T22:00:00Z'))).toBe('boa noite'); // 19h
  });

  it('traz os dados da loja e o histórico em ordem', () => {
    const context = buildLeadContext({
      lead: LEAD,
      now: new Date('2026-10-16T13:00:00Z'),
      activities: [
        {
          type: 'WHATSAPP_MESSAGE_RECEIVED',
          text: 'Já foi repassado ao setor responsável',
          fromStage: null,
          toStage: null,
          channel: 'whatsapp',
          cadenceStep: 1,
          createdAt: new Date('2026-10-15T15:00:00Z'),
        },
        {
          type: 'WHATSAPP_MESSAGE_SENT',
          text: 'Oi, bom dia! Me chamo Benedito...',
          fromStage: null,
          toStage: null,
          channel: 'whatsapp',
          cadenceStep: 1,
          createdAt: new Date('2026-10-15T12:00:00Z'),
        },
      ],
    });

    expect(context).toContain('Loja: Mikkis Tech');
    expect(context).toContain('Google: nota 4,8 com 312 avaliações');
    expect(context).toContain('Anuncia no Meta: sim, anuncia no Meta');
    expect(context).toContain('Responsável: ainda não sabemos quem decide');
    expect(context).toContain('Saudação: bom dia');
    // Mais antigo primeiro: a mensagem do Benedito vem antes da resposta
    expect(context.indexOf('BENEDITO no WhatsApp')).toBeLessThan(context.indexOf('LEAD no WhatsApp'));
  });

  it('avisa a IA quando o histórico está vazio', () => {
    const context = buildLeadContext({ lead: LEAD, activities: [], now: new Date() });
    expect(context).toContain('(nada registrado ainda)');
  });
});
