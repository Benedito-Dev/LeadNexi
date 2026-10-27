import { BadRequestException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import type * as z from 'zod/v4';
import { AiFeature, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiModelService } from './ai-model.service.js';
import { GenerateMessageDto, SuggestionFeedbackDto, SuggestReplyDto } from './dto/ai-requests.dto.js';
import { checkGuardrails } from './guardrails.js';
import { buildLeadContext, HISTORY_LIMIT } from './lead-context.js';
import {
  ANALYSIS_SYSTEM,
  CAPTION_SYSTEM,
  MESSAGE_SYSTEM,
  PROMPT_VERSIONS,
  REPLY_SYSTEM,
  SUMMARY_SYSTEM,
} from './prompts.js';
import { AnalysisOutput, CaptionOutput, MessageOutput, ReplyOutput, SummaryOutput } from './schemas.js';

const STEP_TASK: Record<number, string> = {
  1: '1ª mensagem da cadência (dia 0), para o número da loja.',
  2: 'Follow-up 1 da cadência (dia 2): o lead ainda não respondeu a 1ª mensagem.',
  3: 'Follow-up final da cadência (dia 5): última mensagem, sem pressão.',
};

/** Tipos de evento que são mensagem do lead (para "Sugerir resposta"). */
const INCOMING = ['WHATSAPP_MESSAGE_RECEIVED', 'INSTAGRAM_MESSAGE'] as const;

const leadWithContext = {
  include: {
    stage: { select: { name: true, stageType: true } },
    list: { select: { name: true } },
    activities: { orderBy: { createdAt: 'desc' }, take: HISTORY_LIMIT },
  },
} satisfies Prisma.LeadDefaultArgs;

type LeadWithContext = Prisma.LeadGetPayload<typeof leadWithContext>;

/**
 * Recursos de IA da spec F4: gerar mensagem, sugerir resposta, resumir (com próximo passo) e
 * textos da análise grátis. A IA só sugere; nada é enviado daqui. Cada resposta fica em
 * ai_suggestions, com o contexto enviado, para depurar e para medir o que funciona.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly model: AiModelService,
  ) {}

  status() {
    return { configured: this.model.configured, model: this.model.model };
  }

  async generateMessage(leadId: string, { channel = 'whatsapp', step }: GenerateMessageDto) {
    const lead = await this.loadLead(leadId);
    const prospecting = lead.stage.stageType === 'CONTACT' || lead.stage.stageType === 'SENT';
    const nextStep = step ?? Math.min((lead.cadenceStep ?? 0) + 1, 3);
    const where = channel === 'instagram' ? 'pelo Direct do Instagram' : 'pelo WhatsApp';
    const task = prospecting
      ? `Escreva a próxima mensagem ${where}. Passo: ${STEP_TASK[nextStep]}`
      : `Escreva a próxima mensagem ${where}, continuando a conversa a partir do histórico (o lead está em "${lead.stage.name}").`;

    const { context, output, suggestionId } = await this.run(lead, 'MESSAGE', MESSAGE_SYSTEM, task, MessageOutput, {
      channel,
      step: prospecting ? nextStep : null,
    });
    return {
      suggestionId,
      model: this.model.model,
      step: prospecting ? nextStep : null,
      options: output.options.slice(0, 3).map((option) => ({
        ...option,
        warnings: checkGuardrails(option.text, context),
      })),
    };
  }

  async suggestReply(leadId: string, { channel = 'whatsapp', message }: SuggestReplyDto) {
    const lead = await this.loadLead(leadId);
    const pasted = message?.trim();
    const last = lead.activities.find((activity) => (INCOMING as readonly string[]).includes(activity.type));
    const incoming = pasted || last?.text?.trim();
    if (!incoming) {
      throw new BadRequestException('Cole a mensagem do lead para a IA sugerir uma resposta.');
    }
    const where = channel === 'instagram' ? 'no Direct do Instagram' : 'no WhatsApp';
    const task = `Última mensagem do lead ${where}:\n"""${incoming}"""\n\nClassifique a intenção e sugira a resposta do Benedito.`;

    const { context, output, suggestionId } = await this.run(lead, 'REPLY', REPLY_SYSTEM, task, ReplyOutput, {
      channel,
      message: incoming,
    });
    return {
      suggestionId,
      model: this.model.model,
      intent: output.intent,
      objection: output.objection,
      warning: output.warning,
      responsibleName: output.responsibleName,
      options: output.options.slice(0, 2).map((option) => ({
        ...option,
        // A mensagem do lead também conta como fonte (ex.: ele mesmo citou um valor)
        warnings: checkGuardrails(option.text, `${context}\n${incoming}`),
      })),
    };
  }

  /** Resume a conversa e guarda no lead (aparece no topo do painel). */
  async summarize(leadId: string) {
    const lead = await this.loadLead(leadId);
    const { output, suggestionId } = await this.run(
      lead,
      'SUMMARY',
      SUMMARY_SYSTEM,
      'Resuma a situação deste lead e sugira o próximo passo.',
      SummaryOutput,
      {},
    );
    const generatedAt = new Date();
    const summary = { ...output, suggestionId };
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { aiSummary: summary, aiSummaryAt: generatedAt },
    });
    return { ...summary, generatedAt };
  }

  async analysis(leadId: string) {
    const lead = await this.loadLead(leadId);
    const { context, output, suggestionId } = await this.run(
      lead,
      'ANALYSIS',
      ANALYSIS_SYSTEM,
      'Escreva os textos da análise grátis para esta loja.',
      AnalysisOutput,
      {},
    );
    const allText = [
      output.headline,
      ...output.findings,
      ...output.opportunities,
      output.reference?.text ?? '',
      output.invitation,
    ].join('\n');
    return {
      suggestionId,
      model: this.model.model,
      ...output,
      opportunities: output.opportunities.slice(0, 3),
      warnings: checkGuardrails(allText, context),
    };
  }

  /**
   * Legenda do post a partir das imagens (tela Conteúdo). Não é de um lead, então não fica em
   * ai_suggestions (que pertence a um lead); a legenda vai para o post quando ele é agendado.
   */
  async writeCaption(images: { buffer: Buffer }[] | undefined) {
    if (!images?.length) throw new BadRequestException('Envie ao menos 1 imagem no campo "images".');
    if (images.some(({ buffer }) => buffer[0] !== 0xff || buffer[1] !== 0xd8)) {
      throw new UnsupportedMediaTypeException('As imagens precisam estar em JPEG.');
    }
    const task =
      images.length > 1
        ? `Escreva a legenda deste carrossel de ${images.length} imagens.`
        : 'Escreva a legenda deste post de 1 imagem.';
    const output = await this.model.generate({
      system: CAPTION_SYSTEM,
      context: '',
      task,
      schema: CaptionOutput,
      images: images.map(({ buffer }) => buffer),
    });
    return {
      model: this.model.model,
      caption: output.caption,
      warnings: checkGuardrails(output.caption, ''),
    };
  }

  async feedback(id: string, { chosenIndex, feedback }: SuggestionFeedbackDto) {
    const found = await this.prisma.aiSuggestion.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Sugestão não encontrada');
    const updated = await this.prisma.aiSuggestion.update({
      where: { id },
      data: {
        ...(chosenIndex !== undefined ? { chosenIndex } : {}),
        ...(feedback !== undefined ? { feedback: feedback === 0 ? null : feedback } : {}),
      },
      select: { id: true, chosenIndex: true, feedback: true },
    });
    return updated;
  }

  private async loadLead(id: string): Promise<LeadWithContext> {
    const lead = await this.prisma.lead.findUnique({ where: { id }, ...leadWithContext });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  /** Monta o contexto, chama o modelo e grava a sugestão. */
  private async run<Schema extends z.ZodType>(
    lead: LeadWithContext,
    feature: AiFeature,
    system: string,
    task: string,
    schema: Schema,
    request: Record<string, unknown>,
  ): Promise<{ context: string; output: z.infer<Schema>; suggestionId: string }> {
    const proofs = await this.prisma.proof.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { text: true, source: true, referenceDate: true, canNameClient: true },
    });
    const context = buildLeadContext({ lead, activities: lead.activities, proofs, now: new Date() });
    const output = await this.model.generate({ system, context, task, schema });
    const suggestion = await this.prisma.aiSuggestion.create({
      data: {
        leadId: lead.id,
        feature,
        promptVersion: PROMPT_VERSIONS[feature],
        model: this.model.model,
        input: { ...request, task, context } as Prisma.InputJsonObject,
        output: output as Prisma.InputJsonObject,
      },
      select: { id: true },
    });
    return { context, output, suggestionId: suggestion.id };
  }
}
