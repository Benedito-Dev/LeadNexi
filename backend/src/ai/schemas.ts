import * as z from 'zod/v4';

// Formato exigido da resposta do modelo em cada recurso (saída estruturada da API).

export const MessageOutput = z.object({
  options: z
    .array(
      z.object({
        label: z.string().describe('Rótulo curto da abordagem, ex.: "Pede o responsável"'),
        text: z.string().describe('A mensagem pronta para enviar'),
        template: z.string().describe('Template base: B1 a B8, ou "livre"'),
      }),
    )
    .describe('Exatamente 3 opções: a principal primeiro, depois 2 variações'),
});
export type MessageOutput = z.infer<typeof MessageOutput>;

export const REPLY_INTENTS = [
  'interested',
  'price',
  'objection',
  'forwarded',
  'auto_reply',
  'not_interested',
  'other',
] as const;

export const ReplyOutput = z.object({
  intent: z.enum(REPLY_INTENTS),
  objection: z.string().nullable().describe('Qual objeção, quando intent = objection'),
  warning: z.string().nullable().describe('Aviso para o Benedito, ex.: resposta automática'),
  responsibleName: z.string().nullable().describe('Nome do responsável, se o lead disse'),
  options: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .describe('Exatamente 2 opções: a resposta sugerida e 1 alternativa'),
});
export type ReplyOutput = z.infer<typeof ReplyOutput>;

export const SummaryOutput = z.object({
  situation: z.string(),
  wants: z.string(),
  nextStep: z.string(),
  nextStepDays: z.number().int().nullable(),
});
export type SummaryOutput = z.infer<typeof SummaryOutput>;

export const CaptionOutput = z.object({
  caption: z.string().describe('A legenda pronta, com as hashtags no fim'),
});
export type CaptionOutput = z.infer<typeof CaptionOutput>;

export const AnalysisOutput = z.object({
  headline: z.string(),
  findings: z.array(z.string()),
  opportunities: z.array(z.string()).describe('Exatamente 3 oportunidades'),
  reference: z.object({ text: z.string(), source: z.string() }).nullable(),
  invitation: z.string(),
});
export type AnalysisOutput = z.infer<typeof AnalysisOutput>;
