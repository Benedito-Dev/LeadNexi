import type { PrismaService } from '../prisma/prisma.service.js';
import type { ResultsService } from '../results/results.service.js';
import { LeadListsService } from './lead-lists.service.js';

const lista = (id: string, leads: number) => ({ id, name: id, niche: null, city: null, targetContacts: null, archived: false, _count: { leads } });
const lead = (id: string, listId: string, stageType = 'CONTACT') => ({ id, listId, stage: { stageType } });
const atividade = (leadId: string, type: string) => ({ leadId, type });

function setup(leads: ReturnType<typeof lead>[], activities: ReturnType<typeof atividade>[] = []) {
  const prisma = {
    leadList: { findMany: vi.fn().mockResolvedValue([lista('celular', 40), lista('academias', 5)]) },
    lead: { findMany: vi.fn().mockResolvedValue(leads) },
    leadActivity: { findMany: vi.fn().mockResolvedValue(activities) },
  };
  const results = { getSettings: vi.fn().mockResolvedValue({ decisionContacts: 3, decisionMinReplies: 2 }) };
  return new LeadListsService(prisma as unknown as PrismaService, results as unknown as ResultsService);
}

describe('LeadListsService › placar das listas', () => {
  it('conta pelo histórico e pela etapa (lead importado já adiantado no funil)', async () => {
    const service = setup(
      [
        lead('a', 'academias', 'SENT'),
        lead('b', 'academias', 'CONTACT'),
        lead('c', 'academias', 'MEETING'),
        lead('d', 'academias', 'WON'),
        // Mandou direct sem ter sido contatado: continua em "A contatar", não conta
        lead('e', 'academias', 'CONTACT'),
      ],
      [atividade('a', 'WHATSAPP_MESSAGE_SENT'), atividade('a', 'WHATSAPP_MESSAGE_RECEIVED'), atividade('b', 'INSTAGRAM_MESSAGE_SENT'), atividade('e', 'INSTAGRAM_MESSAGE')],
    );

    const [, academias] = await service.findAll();

    expect(academias).toMatchObject({ leadCount: 5, contacted: 4, replied: 3, won: 1, alert: false });
  });

  it('avisa quando a lista passou de N contatos com menos de M respostas', async () => {
    const service = setup([lead('a', 'celular', 'SENT'), lead('b', 'celular', 'SENT'), lead('c', 'celular', 'RESPONDED'), lead('d', 'celular')]);

    const [celular, academias] = await service.findAll();

    expect(celular).toMatchObject({ contacted: 3, replied: 1, alert: true });
    expect(academias).toMatchObject({ contacted: 0, replied: 0, won: 0, alert: false });
  });
});
