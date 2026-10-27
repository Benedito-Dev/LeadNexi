import type { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_MESSAGE_TEMPLATES } from './message-templates.js';
import { ResultsService } from './results.service.js';

const ROW = {
  id: 1,
  dailyTarget: 5,
  weeklyTarget: 30,
  monthlyRevenueGoal: 300,
  dailyLimit: 8,
  decisionContacts: 30,
  decisionMinReplies: 2,
  messageFirst: null,
  messageFollowUp: 'Oi, {loja}! Retomando.',
  messageLast: null,
};

function setup(row: typeof ROW | null) {
  const prisma = {
    prospectingSettings: {
      findUnique: vi.fn().mockResolvedValue(row),
      upsert: vi.fn().mockImplementation(({ update }: { update: object }) => Promise.resolve({ ...ROW, ...update })),
    },
  };
  return { prisma, service: new ResultsService(prisma as unknown as PrismaService) };
}

describe('ResultsService › modelos de mensagem', () => {
  it('devolve o modelo salvo e, sem texto salvo, o padrão', async () => {
    const { service } = setup(ROW);
    const settings = await service.getSettings();
    expect(settings.messageFirst).toBe(DEFAULT_MESSAGE_TEMPLATES.messageFirst);
    expect(settings.messageFollowUp).toBe('Oi, {loja}! Retomando.');
    expect(settings.messageLast).toBe(DEFAULT_MESSAGE_TEMPLATES.messageLast);
  });

  it('sem configuração salva, devolve os 3 padrões', async () => {
    const { service } = setup(null);
    expect(await service.getSettings()).toMatchObject(DEFAULT_MESSAGE_TEMPLATES);
  });

  it('modelo vazio volta ao padrão (null no banco) e o texto é gravado sem espaços nas pontas', async () => {
    const { service, prisma } = setup(ROW);
    const settings = await service.updateSettings({ messageFollowUp: '  ', messageLast: '  Tchau, {loja}.  ' });
    expect(prisma.prospectingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { messageFollowUp: null, messageLast: 'Tchau, {loja}.' } }),
    );
    expect(settings.messageFollowUp).toBe(DEFAULT_MESSAGE_TEMPLATES.messageFollowUp);
    expect(settings.messageLast).toBe('Tchau, {loja}.');
  });
});
