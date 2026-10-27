/**
 * Modelos de mensagem da cadência de prospecção (Configurações › Prospecção). O front troca os
 * marcadores antes de abrir o WhatsApp: {saudacao} = "Bom dia" / "Boa tarde" / "Boa noite",
 * {loja} = nome do lead, {data} = dia da última mensagem ("Hoje", "qui., 02/10").
 */
export const DEFAULT_MESSAGE_TEMPLATES = {
  messageFirst:
    'Oi, {saudacao}! Tudo bem? Me chamo Benedito, sou da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios no Instagram pra lojas de celular e gostaria de apresentar meu trabalho pro responsável da {loja}.\n\nVocê consegue me dizer qual o melhor jeito de falar com ele? Obrigado!',
  messageFollowUp:
    'Oi! Só retomando a mensagem de {data}. Se fizer sentido, te mando um exemplo de anúncio pra {loja}, sem compromisso. Se não for o momento, tudo bem também.',
  messageLast:
    'Última mensagem pra não te incomodar 🙂 Se um dia quiser uma análise grátis dos anúncios da {loja}, é só me chamar aqui.',
};

export type MessageTemplates = typeof DEFAULT_MESSAGE_TEMPLATES;

export const MESSAGE_TEMPLATE_KEYS = Object.keys(DEFAULT_MESSAGE_TEMPLATES) as (keyof MessageTemplates)[];

/** O texto salvo de cada modelo ou, sem texto salvo, o padrão. */
export function messageTemplates(
  row: { messageFirst: string | null; messageFollowUp: string | null; messageLast: string | null } | null,
): MessageTemplates {
  return {
    messageFirst: row?.messageFirst || DEFAULT_MESSAGE_TEMPLATES.messageFirst,
    messageFollowUp: row?.messageFollowUp || DEFAULT_MESSAGE_TEMPLATES.messageFollowUp,
    messageLast: row?.messageLast || DEFAULT_MESSAGE_TEMPLATES.messageLast,
  };
}
