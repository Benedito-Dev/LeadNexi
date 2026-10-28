import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { AiModelService } from './ai-model.service.js';
import { AiService } from './ai.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const LEAD = {
  id: 'lead-1',
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
  instagramUsername: null,
  notes: null,
  lostReason: null,
  stage: { name: 'Mensagem enviada', stageType: 'SENT' },
  list: { name: 'Lojas de celular' },
  activities: [] as {
    type: string;
    text: string | null;
    fromStage: null;
    toStage: null;
    channel: string;
    cadenceStep: number;
    createdAt: Date;
  }[],
};

function setup(output: unknown) {
  const prisma = {
    lead: { findUnique: vi.fn().mockResolvedValue(LEAD), update: vi.fn().mockResolvedValue({}) },
  };
  const model = { model: 'claude-opus-5-5', configured: true, generate: vi.fn().mockResolvedValue(output) };
  const service = new AiService(prisma as unknown as PrismaService, model as unknown as AiModelService);
  return { prisma, model, service };
}

describe('AiService', () => {
  it('gera o follow-up 1 para quem recebeu a 1ª mensagem e confere as regras de ouro', async () => {
    const { service, model, prisma } = setup({
      options: [
        { label: 'Retoma', text: 'Oi! Só retomando a mensagem de ontem.', template: 'B5' },
        { label: 'Promete', text: 'Vendas garantidas com 50% de desconto!', template: 'livre' },
        { label: 'Curta', text: 'Oi! Conseguiu ver minha mensagem?', template: 'B5' },
      ],
    });

    const result = await service.generateMessage('lead-1', {});

    expect(result.step).toBe(2);
    expect(model.generate.mock.calls[0][0].task).toContain('Follow-up 1');
    expect(result.options).toHaveLength(3);
    expect(result.options[0].warnings).toEqual([]);
    expect(result.options[1].warnings.map((warning) => warning.kind)).toEqual(['number', 'promise']);
  });

  it('sugere resposta para a última mensagem recebida do lead', async () => {
    const { service, model, prisma } = setup({
      intent: 'forwarded',
      objection: null,
      warning: null,
      responsibleName: null,
      options: [
        { label: 'Agradece', text: 'Muito obrigado! Me diz o nome de quem cuida desse setor?' },
        { label: 'Curta', text: 'Obrigado! Com quem eu falo lá?' },
      ],
    });
    prisma.lead.findUnique.mockResolvedValue({
      ...LEAD,
      activities: [
        {
          type: 'WHATSAPP_MESSAGE_RECEIVED',
          text: 'Já foi repassado ao setor responsável',
          fromStage: null,
          toStage: null,
          channel: 'whatsapp',
          cadenceStep: 1,
          createdAt: new Date(),
        },
      ],
    });

    const result = await service.suggestReply('lead-1', {});

    expect(model.generate.mock.calls[0][0].task).toContain('Já foi repassado ao setor responsável');
    expect(result.intent).toBe('forwarded');
    expect(result.options).toHaveLength(2);
  });

  it('pede a mensagem quando não há nada do lead para responder', async () => {
    const { service } = setup({});
    await expect(service.suggestReply('lead-1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda o resumo no lead', async () => {
    const summary = { situation: 'Mandou a 1ª mensagem.', wants: 'Nada ainda.', nextStep: 'Follow-up 1', nextStepDays: 2 };
    const { service, prisma } = setup(summary);

    const result = await service.summarize('lead-1');

    expect(result).toMatchObject(summary);
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lead-1' }, data: expect.objectContaining({ aiSummary: summary }) }),
    );
  });

  it('escreve a legenda vendo as imagens do post e confere as regras de ouro', async () => {
    const { service, model, prisma } = setup({ caption: 'Seu anúncio com resultado garantido.\n\n#AlvoDigital #Fortaleza' });
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

    const result = await service.writeCaption([{ buffer: jpeg }, { buffer: jpeg }]);

    expect(model.generate.mock.calls[0][0].images).toEqual([jpeg, jpeg]);
    expect(model.generate.mock.calls[0][0].task).toContain('carrossel de 2 imagens');
    expect(result.caption).toContain('#AlvoDigital');
    expect(result.warnings.map((warning) => warning.kind)).toEqual(['promise']);
  });

  it('recusa legenda sem imagem ou com imagem fora do JPEG', async () => {
    const { service } = setup({});
    await expect(service.writeCaption([])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.writeCaption([{ buffer: Buffer.from('PNG') }])).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});
