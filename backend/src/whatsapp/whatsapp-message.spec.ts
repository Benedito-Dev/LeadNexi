import { formatPhone, parseUpsert, phoneVariants } from './whatsapp-message.js';

// Leitura dos avisos da Evolution (formato do Baileys) e as formas de um número brasileiro.
describe('whatsapp-message', () => {
  const upsert = (data: unknown) => ({ event: 'messages.upsert', instance: 'leadnexi', data });
  const recebida = {
    key: { remoteJid: '5585988124471@s.whatsapp.net', fromMe: false, id: 'ABC123' },
    pushName: 'Marcos',
    message: { conversation: 'Pode ser amanhã às 10h?' },
    messageTimestamp: 1793210000,
  };

  it('lê a mensagem recebida: texto, número, nome e hora', () => {
    expect(parseUpsert(upsert(recebida))).toEqual([
      {
        id: 'ABC123',
        fromMe: false,
        jid: '5585988124471@s.whatsapp.net',
        phone: '5585988124471',
        pushName: 'Marcos',
        text: 'Pode ser amanhã às 10h?',
        sentAt: new Date(1793210000 * 1000),
      },
    ]);
  });

  it('aceita o nome do evento em maiúsculas e o texto de resposta (extendedTextMessage)', () => {
    const [m] = parseUpsert({
      event: 'MESSAGES_UPSERT',
      data: { ...recebida, message: { extendedTextMessage: { text: 'Fechado!' } } },
    });
    expect(m.text).toBe('Fechado!');
  });

  it('enviada pelo próprio número não leva o nome de quem recebe', () => {
    const [m] = parseUpsert(upsert({ ...recebida, key: { ...recebida.key, fromMe: true } }));
    expect(m).toMatchObject({ fromMe: true, pushName: null });
  });

  it('mídia vira a legenda ou a descrição; mensagem temporária é desembrulhada', () => {
    const imagem = parseUpsert(upsert({ ...recebida, message: { imageMessage: { caption: 'Olha a vitrine' } } }));
    const audio = parseUpsert(upsert({ ...recebida, message: { ephemeralMessage: { message: { audioMessage: {} } } } }));
    expect(imagem[0].text).toBe('Olha a vitrine');
    expect(audio[0].text).toBe('Enviou um áudio');
  });

  it('usa o número quando a conversa vem com o identificador anônimo (@lid)', () => {
    const [m] = parseUpsert(
      upsert({ ...recebida, key: { remoteJid: '123456789@lid', remoteJidAlt: '5585988124471@s.whatsapp.net', fromMe: false, id: 'L1' } }),
    );
    expect(m).toMatchObject({ jid: '5585988124471@s.whatsapp.net', phone: '5585988124471' });
  });

  it('ignora grupo, status, aviso técnico, reação e outros eventos', () => {
    expect(parseUpsert(upsert({ ...recebida, key: { ...recebida.key, remoteJid: '120363@g.us' } }))).toEqual([]);
    expect(parseUpsert(upsert({ ...recebida, key: { ...recebida.key, remoteJid: 'status@broadcast' } }))).toEqual([]);
    expect(parseUpsert(upsert({ ...recebida, message: { protocolMessage: { type: 0 } } }))).toEqual([]);
    expect(parseUpsert(upsert({ ...recebida, message: { reactionMessage: { text: '👍' } } }))).toEqual([]);
    expect(parseUpsert({ event: 'connection.update', data: { state: 'open' } })).toEqual([]);
  });

  it('acha o número com e sem 55 e com e sem o 9 depois do DDD', () => {
    expect(phoneVariants('5585988124471')).toEqual(expect.arrayContaining(['85988124471', '5585988124471', '8588124471', '558588124471']));
    expect(phoneVariants('558588124471')).toEqual(expect.arrayContaining(['85988124471', '8588124471']));
    // Fixo (começa com 2 a 5) não ganha o 9
    expect(phoneVariants('558532610090')).toEqual(['8532610090', '558532610090']);
  });

  it('formata o número brasileiro para mostrar', () => {
    expect(formatPhone('5585988124471')).toBe('+55 85 98812-4471');
    expect(formatPhone('558532610090')).toBe('+55 85 3261-0090');
    expect(formatPhone('14155550100')).toBe('+14155550100');
  });
});
