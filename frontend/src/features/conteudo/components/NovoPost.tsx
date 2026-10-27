import { useEffect, useRef, useState, type DragEvent } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Clapperboard, FileText, ImagePlus, LoaderCircle, Send, Sparkles, TriangleAlert, X } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { BotaoDaIA } from '@/components/ia/BotaoDaIA'
import { Button } from '@/components/ui/button'
import { SeletorDeDataEHora } from '@/components/ui/seletor-de-data-hora'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ErroDeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatarDiaEHora } from '../../hoje/textos'
import { MensagemDeErro } from '../../instagram/components/CartaoAppDaMeta'
import { confirmarVideo, criarPost, enviarCapaDoVideo, enviarImagem, iniciarEnvioDeVideo, type PostCriado } from '../api'
import { contarHashtags, LIMITE_DA_LEGENDA, LIMITE_DE_HASHTAGS, MAX_IMAGENS, prepararImagem, type ImagemPreparada } from '../imagens'
import { dicaDaIA, useStatusDaIA } from '../../ia/useStatusDaIA'
import { escreverLegendaComIA } from '../ia'
import { ehVideo, enviarComProgresso, formatarDuracao, formatarTamanho, prepararVideo, type VideoPreparado } from '../video'
import type { Post } from '../tipos'
import { GruposDeHashtags } from './GruposDeHashtags'


type Modo = 'agendar' | 'agora' | 'rascunho'

/** "2026-10-02T09:00" no horário local, para o <input type="datetime-local">. */
function paraCampo(data: Date) {
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`
}

type Props = {
  aberto: boolean
  /** Sem conta conectada dá para montar o post, mas não agendar nem publicar */
  conectado: boolean
  /** Post a duplicar: a legenda e as imagens já vêm preenchidas */
  base: Post | null
  /** Dia já escolhido ("AAAA-MM-DD"), vindo do "+" do calendário */
  dia?: string | null
  onFechar: () => void
  onCriado: (post: PostCriado) => void
}

/**
 * Novo post: painel à direita com as imagens (foto única ou carrossel de até 10, na ordem da
 * capa), a legenda com os grupos de hashtags e quando publicar. As imagens viram JPEG no
 * navegador, já no formato que o Instagram aceita, e sobem uma por vez.
 */
export function NovoPost({ aberto, conectado, base, dia, onFechar, onCriado }: Props) {
  return (
    <Sheet open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 font-marca sm:max-w-xl">
        <header className="border-b border-border px-6 py-4 pr-14">
          <SheetTitle className="m-0 text-lg font-extrabold tracking-[-0.02em] text-foreground">{base ? 'Duplicar post' : 'Novo post'}</SheetTitle>
          <SheetDescription className="m-0 mt-0.5 text-[13px] font-medium text-muted-foreground">Foto, carrossel ou Reel (vídeo), para o Instagram.</SheetDescription>
        </header>
        {aberto && <Editor key={base?.id ?? dia ?? 'novo'} conectado={conectado} base={base} dia={dia} onFechar={onFechar} onCriado={onCriado} />}
      </SheetContent>
    </Sheet>
  )
}

function Editor({ conectado, base, dia, onFechar, onCriado }: Omit<Props, 'aberto'>) {
  const [imagens, setImagens] = useState<ImagemPreparada[]>([])
  // Reel: um vídeo só, no lugar das imagens
  const [video, setVideo] = useState<VideoPreparado | null>(null)
  const [preparando, setPreparando] = useState(false)
  const [erroDeImagem, setErroDeImagem] = useState<string | null>(null)
  const [legenda, setLegenda] = useState(base?.caption ?? '')
  const [modo, setModo] = useState<Modo>('agendar')
  const [minimo] = useState(() => paraCampo(new Date()))
  // Padrão: amanhã às 9h. Vindo do "+" do calendário: aquele dia às 9h (hoje, se já passou das 9h, a próxima hora cheia)
  const [quando, setQuando] = useState(() => {
    const agora = new Date()
    const escolhido = dia ? new Date(`${dia}T09:00`) : new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 9)
    if (escolhido.getTime() <= agora.getTime()) {
      escolhido.setTime(agora.getTime())
      escolhido.setHours(agora.getHours() + 1, 0, 0, 0)
    }
    return paraCampo(escolhido)
  })
  const [arrastando, setArrastando] = useState(false)
  // A IA escrevendo a legenda: a caixa vira um carregando até voltar preenchida
  const [escrevendo, setEscrevendo] = useState(false)
  const statusDaIA = useStatusDaIA()
  // Erro da IA ou avisos da legenda que ela escreveu (número sem fonte, promessa de resultado)
  const [retornoDaIA, setRetornoDaIA] = useState<{ erro: string | null; avisos: string[] }>({ erro: null, avisos: [] })
  // Os próximos 7 dias para escolher com um clique ("Hoje", "Amanhã", "Qua 28"...)
  const [proximosDias] = useState(() =>
    Array.from({ length: 7 }, (_, i) => {
      const data = new Date()
      data.setDate(data.getDate() + i)
      const semana = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
      return { chave: paraCampo(data).slice(0, 10), semana: semana.charAt(0).toUpperCase() + semana.slice(1), dia: data.getDate() }
    }),
  )
  const [enviando, setEnviando] = useState<{ etapa: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Libera as URLs locais das miniaturas ao fechar o painel
  const imagensRef = useRef(imagens)
  useEffect(() => {
    imagensRef.current = imagens
  })
  useEffect(() => () => imagensRef.current.forEach((imagem) => URL.revokeObjectURL(imagem.previa)), [])
  const videoRef = useRef(video)
  useEffect(() => {
    videoRef.current = video
  })
  useEffect(
    () => () => {
      if (videoRef.current) [videoRef.current.previa, videoRef.current.capaPrevia].forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  // Duplicar: baixa as imagens do post original e prepara de novo (o servidor não reaproveita imagem)
  useEffect(() => {
    if (!base || base.images.length === 0) return
    // Reel: só a legenda vem junto (o vídeo teria de ser baixado inteiro); o aviso aparece na seção
    if (base.images.some((m) => m.kind === 'VIDEO')) return
    let ativo = true
    Promise.all(base.images.map(async (img, i) => prepararImagem(await (await fetch(img.url)).blob(), `Imagem ${i + 1}`)))
      .then((prontas) => {
        if (ativo) setImagens(prontas)
        else prontas.forEach((p) => URL.revokeObjectURL(p.previa))
      })
      .catch(() => ativo && setErroDeImagem('Não foi possível copiar as imagens do post. Escolha de novo.'))
    return () => {
      ativo = false
    }
  }, [base])

  const adicionar = async (arquivos: FileList | null) => {
    const lista = Array.from(arquivos ?? [])
    const arquivoDeVideo = lista.find(ehVideo)
    if (arquivoDeVideo) {
      if (imagens.length > 0) return setErroDeImagem('Um Reel tem um vídeo só, sem imagens. Remova as imagens para usar o vídeo.')
      setErroDeImagem(null)
      setPreparando(true)
      try {
        setVideo(await prepararVideo(arquivoDeVideo))
      } catch (e) {
        setErroDeImagem((e as Error).message)
      } finally {
        setPreparando(false)
      }
      return
    }
    const escolhidos = lista.filter((a) => a.type.startsWith('image/'))
    if (escolhidos.length === 0) return
    const espaco = MAX_IMAGENS - imagens.length
    setErroDeImagem(escolhidos.length > espaco ? `Máximo de ${MAX_IMAGENS} imagens por post.` : null)
    setPreparando(true)
    try {
      const prontas = await Promise.all(escolhidos.slice(0, espaco).map((a) => prepararImagem(a, a.name)))
      setImagens((atuais) => [...atuais, ...prontas])
    } catch {
      setErroDeImagem('Não foi possível ler uma das imagens. Tente outro arquivo.')
    } finally {
      setPreparando(false)
    }
  }

  const tirarVideo = () => {
    if (video) [video.previa, video.capaPrevia].forEach((url) => URL.revokeObjectURL(url))
    setVideo(null)
  }

  const remover = (id: string) =>
    setImagens((atuais) => {
      const imagem = atuais.find((i) => i.id === id)
      if (imagem) URL.revokeObjectURL(imagem.previa)
      return atuais.filter((i) => i.id !== id)
    })

  const mover = (indice: number, passo: -1 | 1) =>
    setImagens((atuais) => {
      const proximas = [...atuais]
      const [imagem] = proximas.splice(indice, 1)
      if (imagem) proximas.splice(indice + passo, 0, imagem)
      return proximas
    })

  const soltar = (evento: DragEvent<HTMLLabelElement>) => {
    evento.preventDefault()
    setArrastando(false)
    void adicionar(evento.dataTransfer.files)
  }

  const hashtags = contarHashtags(legenda)
  // O primeiro motivo que impede salvar, dito em português claro
  // Rascunho não sai para o Instagram: dá para guardar sem a conta conectada
  const bloqueio = !conectado && modo !== 'rascunho'
    ? 'Conecte o Instagram para agendar ou publicar.'
    : imagens.length === 0 && !video
      ? 'Adicione uma imagem ou um vídeo.'
      : imagens.some((i) => !i.proporcaoOk)
        ? 'Ajuste as imagens marcadas: a proporção precisa ficar entre 4:5 e 1,91:1.'
        : legenda.length > LIMITE_DA_LEGENDA
          ? `A legenda passou de ${LIMITE_DA_LEGENDA} caracteres.`
          : hashtags > LIMITE_DE_HASHTAGS
            ? `Use no máximo ${LIMITE_DE_HASHTAGS} hashtags.`
            : modo !== 'agendar'
              ? null
              : !quando
                ? 'Escolha a data e a hora.'
                : // Mesmo formato ("2026-10-02T09:00"): dá para comparar como texto. O servidor confere de novo.
                  quando < minimo
                  ? 'Escolha um horário no futuro.'
                  : null

  const situacao = enviando
    ? enviando.etapa
    : (bloqueio ??
      (modo === 'agora'
        ? 'Vai para o seu perfil assim que você clicar em "Publicar agora".'
        : modo === 'rascunho'
          ? 'Fica guardado em Rascunhos, sem data. Você (ou o Estrategista) agenda depois.'
          : `Será publicado ${formatarDiaEHora(new Date(quando).toISOString()).toLowerCase()}.`))

  const escreverComIA = async () => {
    setEscrevendo(true)
    setRetornoDaIA({ erro: null, avisos: [] })
    try {
      const paraLer: ImagemPreparada[] = video
        ? [{ id: 'capa', nome: 'Capa do vídeo', blob: video.capa, previa: video.capaPrevia, largura: video.largura, altura: video.altura, proporcaoOk: true }]
        : imagens
      const { legenda: escrita, avisos } = await escreverLegendaComIA(paraLer)
      setLegenda(escrita)
      setRetornoDaIA({ erro: null, avisos: avisos.map((aviso) => aviso.detail) })
    } catch (e) {
      setRetornoDaIA({ erro: e instanceof ErroDeApi ? e.message : 'A IA não respondeu. Tente de novo.', avisos: [] })
    } finally {
      setEscrevendo(false)
    }
  }

  const salvar = async () => {
    if (bloqueio || enviando) return
    setErro(null)
    try {
      const ids: string[] = []
      if (video) {
        setEnviando({ etapa: 'Preparando o envio do vídeo…' })
        const envio = await iniciarEnvioDeVideo({
          mimeType: video.arquivo.type,
          sizeBytes: video.arquivo.size,
          width: video.largura,
          height: video.altura,
          durationMs: video.duracaoMs,
        })
        await enviarComProgresso(envio.uploadUrl, video.arquivo, envio.headers, (fracao) =>
          setEnviando({ etapa: `Enviando o vídeo… ${Math.round(fracao * 100)}%` }),
        )
        setEnviando({ etapa: 'Enviando a capa…' })
        await enviarCapaDoVideo(envio.id, video.capa)
        await confirmarVideo(envio.id)
        ids.push(envio.id)
      }
      for (const [i, imagem] of imagens.entries()) {
        setEnviando({ etapa: `Enviando imagem ${i + 1} de ${imagens.length}…` })
        ids.push((await enviarImagem(imagem.blob)).id)
      }
      setEnviando({ etapa: modo === 'agora' ? 'Publicando no Instagram…' : modo === 'rascunho' ? 'Guardando o rascunho…' : 'Agendando…' })
      const quandoSai = modo === 'agora' ? { publishNow: true } : modo === 'rascunho' ? { draft: true } : { scheduledAt: new Date(quando).toISOString() }
      onCriado(await criarPost({ caption: legenda, mediaIds: ids, ...quandoSai }))
    } catch (e) {
      setErro(
        e instanceof ErroDeApi && e.status !== null && e.status < 500
          ? e.message
          : e instanceof Error && e.message.includes('vídeo')
            ? e.message
            : 'Não foi possível salvar o post. Tente de novo.',
      )
      setEnviando(null)
    }
  }

  return (
    <>
      {/* Os blocos não encolhem para caber: o painel rola */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5 [&>*]:shrink-0">
        {/* 1. Quando: a primeira decisão */}
        <section aria-labelledby="np-quando" className="flex flex-col gap-3">
          <Passo id="np-quando" numero={1} titulo="Quando publicar" />
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="np-quando">
            {(
              [
                ['agendar', 'Agendar', 'Escolha o dia e a hora', CalendarClock],
                ['agora', 'Publicar agora', 'Vai direto para o perfil', Send],
                ['rascunho', 'Rascunho', 'Guardar sem data', FileText],
              ] as const
            ).map(([valor, rotulo, detalhe, Icone]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={modo === valor}
                onClick={() => setModo(valor)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition-colors',
                  modo === valor ? 'border-leadnexi-violet bg-leadnexi-violet/10' : 'border-border hover:border-leadnexi-violet/40',
                )}
              >
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', modo === valor ? 'bg-leadnexi-violet-600 text-leadnexi-on-accent' : 'bg-muted text-muted-foreground')}>
                  <Icone aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">{rotulo}</span>
                  <span className="block text-xs font-medium text-muted-foreground">{detalhe}</span>
                </span>
              </button>
            ))}
          </div>
          {modo === 'agendar' && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
              {/* Os próximos 7 dias e os horários de sempre: um clique em cada */}
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {proximosDias.map((d) => (
                  <button
                    key={d.chave}
                    type="button"
                    onClick={() => setQuando(`${d.chave}T${quando.slice(11, 16) || '09:00'}`)}
                    aria-pressed={quando.startsWith(d.chave)}
                    className={cn(
                      'flex min-w-[58px] flex-col items-center rounded-lg border px-2 py-1.5 transition-colors',
                      quando.startsWith(d.chave) ? 'border-leadnexi-violet bg-leadnexi-violet-600 text-leadnexi-on-accent' : 'border-border text-foreground hover:bg-accent',
                    )}
                  >
                    <span className={cn('text-[11px] font-semibold', !quando.startsWith(d.chave) && 'text-muted-foreground')}>{d.semana}</span>
                    <span className="text-base font-extrabold tabular-nums">{d.dia}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['09:00', '12:00', '18:00', '20:00'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setQuando(`${quando.slice(0, 10)}T${h}`)}
                    className={cn(
                      'h-9 rounded-lg border text-sm font-semibold tabular-nums transition-colors',
                      quando.slice(11, 16) === h ? 'border-leadnexi-violet bg-leadnexi-violet/15 text-leadnexi-violet-texto' : 'border-border text-foreground hover:bg-accent',
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <SeletorDeDataEHora valor={quando} minimo={minimo} onChange={setQuando} />
            </div>
          )}
        </section>

        {/* 2. Imagens */}
        <section aria-labelledby="np-imagens" className="flex flex-col gap-3 border-t border-border pt-5">
          <Passo
            id="np-imagens"
            numero={2}
            titulo="Imagens ou vídeo"
            detalhe={
              video
                ? `Reel · ${formatarDuracao(video.duracaoMs)}`
                : imagens.length === 0
                  ? `até ${MAX_IMAGENS} imagens ou 1 vídeo`
                  : imagens.length === 1
                    ? 'Foto única'
                    : `Carrossel · ${imagens.length} imagens`
            }
          />
          {video && (
            <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <video src={video.previa} poster={video.capaPrevia} controls muted playsInline className="h-48 w-28 shrink-0 rounded-lg bg-black object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Clapperboard aria-hidden className="h-4 w-4 text-leadnexi-violet-texto" strokeWidth={1.75} />
                  Reel
                </span>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatarDuracao(video.duracaoMs)} · {formatarTamanho(video.arquivo.size)} · {video.largura} x {video.altura}
                </span>
                <span className="text-xs font-medium text-muted-foreground">A capa é o quadro de 1 segundo.</span>
                {video.altura < video.largura && (
                  <span className="flex items-start gap-1.5 text-xs font-medium text-warn-foreground">
                    <TriangleAlert aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    Vídeo deitado: no Reel ele aparece com faixas. O ideal é em pé (9:16).
                  </span>
                )}
                <button type="button" onClick={tirarVideo} className="mt-auto self-start text-xs font-bold text-muted-foreground hover:text-leadnexi-danger">
                  Tirar o vídeo
                </button>
              </div>
            </div>
          )}
          {!video && imagens.length < MAX_IMAGENS && (
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltar}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3.5 text-left transition-colors',
                arrastando ? 'border-leadnexi-violet bg-leadnexi-violet/10' : 'border-border hover:border-leadnexi-violet/50 hover:bg-accent/40',
              )}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-leadnexi-violet/15 text-leadnexi-violet-texto">
                {preparando ? <LoaderCircle aria-hidden className="h-5 w-5 animate-spin" strokeWidth={1.75} /> : <ImagePlus aria-hidden className="h-5 w-5" strokeWidth={1.75} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{preparando ? 'Preparando…' : imagens.length > 0 ? 'Adicionar mais imagens' : 'Arraste ou clique para escolher'}</span>
                <span className="block text-xs font-medium text-muted-foreground">
                  {imagens.length > 0 ? 'JPG, PNG ou WebP · entre 4:5 e 1,91:1' : 'Imagens JPG, PNG ou WebP · ou 1 vídeo MP4/MOV para Reel (até 300 MB)'}
                </span>
              </span>
              <input
                type="file"
                accept={imagens.length > 0 ? 'image/*' : 'image/*,video/mp4,video/quicktime'}
                multiple
                className="sr-only"
                onChange={(e) => {
                  void adicionar(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          )}
          {imagens.length > 0 && (
            <ol className="m-0 grid grid-cols-4 gap-2 p-0">
              {imagens.map((imagem, i) => (
                <li key={imagem.id} className="group/img relative aspect-[4/5] list-none overflow-hidden rounded-lg bg-muted">
                  <img src={imagem.previa} alt={imagem.nome} className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[11px] font-bold tabular-nums text-white">{i + 1}</span>
                  {!imagem.proporcaoOk && (
                    <span title="Proporção fora do permitido (entre 4:5 e 1,91:1)" className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-warn-foreground text-white">
                      <TriangleAlert aria-label="Proporção fora do permitido" className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                  {/* Ações no hover/foco; no toque, sempre */}
                  <div className="absolute inset-x-0 top-0 flex justify-end p-1 opacity-0 transition-opacity group-focus-within/img:opacity-100 group-hover/img:opacity-100 [@media(hover:none)]:opacity-100">
                    <button type="button" onClick={() => remover(imagem.id)} aria-label={`Remover imagem ${i + 1}`} className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white">
                      <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  {imagens.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 opacity-0 transition-opacity group-focus-within/img:opacity-100 group-hover/img:opacity-100 [@media(hover:none)]:opacity-100">
                      <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Mover imagem ${i + 1} para a esquerda`} className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white disabled:invisible">
                        <ChevronLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <button type="button" disabled={i === imagens.length - 1} onClick={() => mover(i, 1)} aria-label={`Mover imagem ${i + 1} para a direita`} className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white disabled:invisible">
                        <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {imagens.length > 1 && <p className="m-0 text-xs font-semibold text-muted-foreground">A imagem 1 é a capa do carrossel.</p>}
          {base?.images.some((m) => m.kind === 'VIDEO') && !video && imagens.length === 0 && (
            <p className="m-0 text-xs font-semibold text-muted-foreground">A legenda do Reel foi copiada. Para o vídeo, escolha o arquivo de novo.</p>
          )}
          {erroDeImagem && <MensagemDeErro texto={erroDeImagem} />}
        </section>

        {/* 3. Legenda */}
        <section aria-labelledby="np-legenda" className="flex flex-col gap-3 border-t border-border pt-5">
          <Passo id="np-legenda" numero={3} titulo="Legenda" detalhe={`${legenda.length}/${LIMITE_DA_LEGENDA}`} alerta={legenda.length > LIMITE_DA_LEGENDA}>
            <BotaoDaIA
              rotulo="Escrever com IA"
              ocupado={escrevendo}
              desabilitado={statusDaIA?.configured !== true || (imagens.length === 0 && !video) || escrevendo || Boolean(enviando)}
              dica={dicaDaIA(statusDaIA, imagens.length === 0 && !video ? 'Escolha uma imagem ou um vídeo primeiro: a IA escreve a partir dele' : video ? 'A IA lê a capa do vídeo e escreve a legenda' : 'A IA lê a imagem e escreve a legenda')}
              onClick={() => void escreverComIA()}
            />
          </Passo>
          {escrevendo ? (
            <div role="status" aria-label="A IA está escrevendo a legenda" className="flex min-h-40 flex-col gap-2.5 rounded-lg border border-leadnexi-violet/40 bg-leadnexi-violet/5 p-4">
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-leadnexi-violet-texto">
                <Sparkles aria-hidden className="h-4 w-4 animate-pulse" strokeWidth={2} />
                Lendo a imagem e escrevendo a legenda…
              </span>
              {['w-11/12', 'w-full', 'w-4/5', 'w-2/3'].map((largura) => (
                <span key={largura} className={cn('h-3 animate-pulse rounded-full bg-leadnexi-violet/15', largura)} />
              ))}
            </div>
          ) : (
            <Textarea
              id="post-legenda"
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              rows={4}
              placeholder="Escreva a legenda do post… #hashtags funcionam aqui"
              className="min-h-24 resize-y text-sm leading-6 [field-sizing:content] max-h-80"
              aria-invalid={legenda.length > LIMITE_DA_LEGENDA || hashtags > LIMITE_DE_HASHTAGS}
            />
          )}
          {retornoDaIA.erro && <MensagemDeErro texto={retornoDaIA.erro} />}
          {retornoDaIA.avisos.map((aviso) => (
            <p key={aviso} className="m-0 flex items-start gap-2 text-[13px] font-medium text-warn-foreground">
              <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
              {aviso}
            </p>
          ))}
          <p className={cn('m-0 text-xs font-semibold tabular-nums', hashtags > LIMITE_DE_HASHTAGS ? 'text-leadnexi-danger' : 'text-muted-foreground')}>
            {hashtags}/{LIMITE_DE_HASHTAGS} hashtags
          </p>
          <GruposDeHashtags legenda={legenda} onMudar={setLegenda} />
        </section>

      </div>

      <footer className="flex flex-col gap-3 border-t border-border px-6 py-4">
        <p className={cn('m-0 text-[13px] font-medium', bloqueio && !enviando ? 'text-warn-foreground' : 'text-muted-foreground')} aria-live="polite">
          {situacao}
        </p>
        {erro && <MensagemDeErro texto={erro} />}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className={cn(botaoSecundarioDoTopo, 'h-11')} onClick={onFechar} disabled={Boolean(enviando)}>
            Cancelar
          </Button>
          <Button className={cn(botaoPrincipalDoTopo, 'h-11')} onClick={() => void salvar()} disabled={Boolean(bloqueio) || Boolean(enviando)}>
            {enviando ? (
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : modo === 'agora' ? (
              <Send aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            ) : modo === 'rascunho' ? (
              <FileText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <CalendarClock aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            )}
            {modo === 'agora' ? 'Publicar agora' : modo === 'rascunho' ? 'Guardar rascunho' : 'Agendar'}
          </Button>
        </div>
      </footer>
    </>
  )
}

/** Cabeçalho de cada passo da gaveta: número, título e um detalhe à direita. */
function Passo({ id, numero, titulo, detalhe, alerta = false, children }: { id: string; numero: number; titulo: string; detalhe?: string; alerta?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-leadnexi-violet/15 text-xs font-extrabold text-leadnexi-violet-texto">
        {numero}
      </span>
      <h3 id={id} className="m-0 flex-1 text-[15px] font-extrabold text-foreground">
        {titulo}
      </h3>
      {children}
      {detalhe && <span className={cn('text-xs font-semibold tabular-nums', alerta ? 'text-leadnexi-danger' : 'text-muted-foreground')}>{detalhe}</span>}
    </div>
  )
}
