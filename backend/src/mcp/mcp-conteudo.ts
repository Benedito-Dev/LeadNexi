import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { CAPTION_LIMIT, MAX_IMAGES } from '../instagram/dto/create-instagram-post.dto.js';
import { MAX_DIRECT_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_MS, MIN_VIDEO_MS } from '../instagram/dto/video-upload.dto.js';
import type { InstagramDirectUploadService } from '../instagram/instagram-direct-upload.service.js';
import type { InstagramPostsService } from '../instagram/instagram-posts.service.js';
import type { InstagramPublisherService } from '../instagram/instagram-publisher.service.js';

export type McpConteudoDeps = {
  posts: InstagramPostsService;
  publisher: InstagramPublisherService;
  envio: InstagramDirectUploadService;
  /** Endereço público do site: os links de envio locais (desenvolvimento) viram completos */
  origin: string;
};

const DIA_MS = 24 * 60 * 60 * 1000;

const resposta = (dados: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 1) }] });

type PostDaTela = Awaited<ReturnType<InstagramPostsService['findOne']>>;

/** O post resumido para o Claude: o que é, a legenda e quando sai. */
const resumoDoPost = (post: PostDaTela) => ({
  id: post.id,
  status: post.status,
  format: post.images[0]?.kind === 'VIDEO' ? 'reel' : post.images.length > 1 ? `carousel (${post.images.length})` : 'photo',
  caption: post.caption,
  scheduledAt: post.scheduledAt,
  createdAt: post.createdAt,
});

/**
 * Ferramentas de Conteúdo (posts do Instagram) para o Claude e os agentes da VPS: enviar
 * imagens e vídeos direto ao armazenamento, guardar como rascunho, ver rascunhos e agendados e
 * agendar. Chamam os mesmos serviços da tela Conteúdo.
 */
export function registrarConteudo(server: McpServer, { posts, publisher, envio, origin }: McpConteudoDeps) {
  const completo = (url: string) => (url.startsWith('/') ? `${origin}${url}` : url);

  server.registerTool(
    'preparar_envio_de_imagem',
    {
      title: 'Preparar envio de imagem',
      description:
        'Primeiro passo para pôr uma imagem num post: devolve um link para enviar o arquivo JPEG com PUT (ex.: curl -X PUT -H "Content-Type: image/jpeg" --data-binary @foto.jpg "<uploadUrl>"). Depois, chame confirmar_envio. Proporção entre 4:5 e 1,91:1.',
      inputSchema: {
        tamanhoBytes: z.number().int().min(1).max(MAX_DIRECT_IMAGE_BYTES).describe('Tamanho do arquivo JPEG, em bytes (até 8 MB)'),
      },
    },
    async ({ tamanhoBytes }) => {
      const envioDaImagem = await envio.startImage({ mimeType: 'image/jpeg', sizeBytes: tamanhoBytes });
      return resposta({ mediaId: envioDaImagem.id, uploadUrl: completo(envioDaImagem.uploadUrl), headers: envioDaImagem.headers, next: 'Envie o arquivo com PUT e chame confirmar_envio.' });
    },
  );

  server.registerTool(
    'preparar_envio_de_video',
    {
      title: 'Preparar envio de vídeo (Reel)',
      description:
        'Primeiro passo de um Reel: devolve dois links de PUT, um para o vídeo (MP4 ou MOV, 3 s a 15 min, até 300 MB; ideal 9:16, H.264 + AAC) e um para a capa em JPEG (ex.: um quadro tirado com ffmpeg). Envie os dois e chame confirmar_envio. Um Reel tem um vídeo só.',
      inputSchema: {
        formato: z.enum(['mp4', 'mov']),
        tamanhoBytes: z.number().int().min(1).max(MAX_VIDEO_BYTES).describe('Tamanho do vídeo, em bytes'),
        largura: z.number().int().min(1),
        altura: z.number().int().min(1),
        duracaoMs: z.number().int().min(MIN_VIDEO_MS).max(MAX_VIDEO_MS).describe('Duração em milissegundos'),
      },
    },
    async ({ formato, tamanhoBytes, largura, altura, duracaoMs }) => {
      const envioDoVideo = await envio.start({
        mimeType: formato === 'mov' ? 'video/quicktime' : 'video/mp4',
        sizeBytes: tamanhoBytes,
        width: largura,
        height: altura,
        durationMs: duracaoMs,
      });
      return resposta({
        mediaId: envioDoVideo.id,
        videoUploadUrl: completo(envioDoVideo.uploadUrl),
        videoHeaders: envioDoVideo.headers,
        coverUploadUrl: completo(envioDoVideo.posterUploadUrl),
        coverHeaders: envioDoVideo.posterHeaders,
        next: 'Envie o vídeo e a capa com PUT e chame confirmar_envio.',
      });
    },
  );

  server.registerTool(
    'confirmar_envio',
    {
      title: 'Confirmar envio',
      description: 'Depois de enviar o arquivo (e a capa, no vídeo): o LeadNexi confere o que chegou e libera a mídia para entrar num post.',
      inputSchema: { mediaId: z.string().uuid() },
    },
    async ({ mediaId }) => resposta({ confirmed: true, ...(await envio.complete(mediaId)) }),
  );

  server.registerTool(
    'criar_rascunho_de_post',
    {
      title: 'Criar rascunho de post',
      description:
        'Guarda um post do Instagram como rascunho (sem data), com mídias já confirmadas: 1 imagem (foto), 2 a 10 imagens (carrossel, na ordem; a 1ª é a capa) ou 1 vídeo (Reel). Ele aparece em Rascunhos na tela Conteúdo, para escolher e agendar depois.',
      inputSchema: {
        legenda: z.string().max(CAPTION_LIMIT).describe('Legenda com as hashtags no fim (até 30 hashtags)'),
        midias: z.array(z.string().uuid()).min(1).max(MAX_IMAGES).describe('IDs das mídias confirmadas, na ordem'),
      },
    },
    async ({ legenda, midias }) => {
      const post = await posts.create({ caption: legenda, mediaIds: midias, draft: true });
      return resposta({ created: true, ...resumoDoPost(post) });
    },
  );

  server.registerTool(
    'listar_rascunhos',
    {
      title: 'Listar rascunhos',
      description: 'Os posts guardados como rascunho (sem data), do mais novo para o mais antigo, para escolher o que agendar.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => resposta((await posts.drafts()).map(resumoDoPost)),
  );

  server.registerTool(
    'listar_posts_agendados',
    {
      title: 'Listar posts agendados',
      description: 'Os posts que vão sair nos próximos dias (agendados, publicando ou com falha), para não marcar dois no mesmo horário.',
      inputSchema: { dias: z.number().int().min(1).max(60).optional().describe('Quantos dias à frente (padrão 7)') },
      annotations: { readOnlyHint: true },
    },
    async ({ dias }) => {
      const agora = new Date();
      const lista = await posts.list({ from: agora, to: new Date(agora.getTime() + (dias ?? 7) * DIA_MS) });
      return resposta(lista.filter((post) => post.status !== 'PUBLISHED' && post.status !== 'REMOVED').map(resumoDoPost));
    },
  );

  server.registerTool(
    'agendar_post',
    {
      title: 'Agendar post',
      description:
        'Agenda um rascunho (ou remarca um agendado) para publicar no Instagram na hora marcada. O horário é de Fortaleza (UTC-03:00). Precisa do Instagram conectado. Ele sai sozinho se a publicação automática estiver ligada.',
      inputSchema: {
        id: z.string().uuid().describe('id do post (vem de listar_rascunhos)'),
        quando: z.iso.datetime({ offset: true }).describe('Data e hora com fuso, ex.: "2026-10-30T19:30:00-03:00"'),
      },
    },
    async ({ id, quando }) => {
      const post = await publisher.update(id, { scheduledAt: quando }, origin);
      return resposta({ scheduled: true, ...resumoDoPost(post), automaticPublishingOff: 'alarmFailed' in post ? post.alarmFailed : undefined });
    },
  );
}
