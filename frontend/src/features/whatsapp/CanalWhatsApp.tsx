import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, LoaderCircle, LogOut, RefreshCw, ShieldAlert, Smartphone } from 'lucide-react'
import { WhatsAppLogo } from '@/brand/icons'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { ErroDeApi } from '@/lib/api'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { buscarSituacao, desconectarWhatsApp, pedirQrCode } from './api'
import type { SituacaoDoWhatsApp } from './tipos'

/** Enquanto o QR está na tela: confere se já conectou e troca o QR antes de ele vencer */
const CONFERE_MS = 3_000
const NOVO_QR_MS = 30_000

/**
 * Canal WhatsApp (Configurações › Canais): ler o QR code do celular do chip, ver se está conectado
 * e desconectar. As conversas passam a chegar em Conversas.
 */
export function CanalWhatsApp() {
  const [situacao, setSituacao] = useState<SituacaoDoWhatsApp | null>(null)
  const [erro, setErro] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const [erroDoQr, setErroDoQr] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const atual = await buscarSituacao()
      setSituacao(atual)
      setErro(false)
      return atual
    } catch {
      setErro(true)
      return null
    }
  }, [])

  useEffect(() => {
    buscarSituacao()
      .then(setSituacao)
      .catch(() => setErro(true))
  }, [])

  const conectar = useCallback(async () => {
    setPedindo(true)
    setErroDoQr(null)
    try {
      const resposta = await pedirQrCode()
      if (resposta.state === 'open') {
        setQr(null)
        await carregar()
      } else setQr(resposta.qr)
    } catch (e) {
      setErroDoQr(e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'A ponte do WhatsApp não respondeu. Confira se ela está ligada e tente de novo.')
      setQr(null)
    } finally {
      setPedindo(false)
    }
  }, [carregar])

  // QR na tela: confere a cada 3 s se o celular já leu e troca o QR a cada 30 s (ele vence)
  const ultimoQr = useRef(0)
  useEffect(() => {
    if (!qr) return
    ultimoQr.current = Date.now()
    const id = window.setInterval(async () => {
      const atual = await carregar()
      if (atual?.configured && atual.reachable && atual.state === 'open') {
        setQr(null)
        addToast('success', 'WhatsApp conectado', atual.phone ?? undefined)
      } else if (Date.now() - ultimoQr.current > NOVO_QR_MS) {
        ultimoQr.current = Date.now()
        void pedirQrCode()
          .then((r) => r.qr && setQr(r.qr))
          .catch(() => undefined)
      }
    }, CONFERE_MS)
    return () => window.clearInterval(id)
  }, [qr, carregar])

  const conectado = situacao?.configured && situacao.reachable && situacao.state === 'open' ? situacao : null

  return (
    <section aria-labelledby="canal-whatsapp" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-whatsapp/15 text-whatsapp">
          <WhatsAppLogo aria-hidden size={18} />
        </span>
        <div>
          <h2 id="canal-whatsapp" className="m-0 text-base font-extrabold text-foreground">WhatsApp</h2>
          <p className="m-0 text-[13px] font-medium text-muted-foreground">
            {conectado?.phone ?? 'Leia o QR code do celular e responda as conversas do WhatsApp em Conversas'}
          </p>
        </div>
      </div>

      {erro && !situacao ? (
        <MensagemDeErro texto="Não foi possível ver a situação do WhatsApp." onTentar={() => void carregar()} />
      ) : !situacao ? (
        <div aria-busy="true" aria-label="Carregando WhatsApp" className="h-28 animate-pulse rounded-xl border border-border bg-card" />
      ) : !situacao.configured ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm font-medium text-muted-foreground">
          A ponte do WhatsApp ainda não está ligada neste servidor. Ela precisa de uma máquina sempre ligada (no seu Mac, para testar, ou numa
          VPS) e das variáveis <span className="font-mono text-[13px]">EVOLUTION_URL</span> e{' '}
          <span className="font-mono text-[13px]">EVOLUTION_API_KEY</span>.
        </div>
      ) : !situacao.reachable ? (
        <MensagemDeErro texto="A ponte do WhatsApp não respondeu. Confira se ela está ligada." onTentar={() => void carregar()} />
      ) : conectado ? (
        <CartaoConectado phone={conectado.phone} name={conectado.name} onDesconectado={() => void carregar()} />
      ) : qr ? (
        <CartaoQrCode qr={qr} onCancelar={() => setQr(null)} />
      ) : (
        <CartaoConectar pedindo={pedindo} erro={erroDoQr} onConectar={() => void conectar()} />
      )}
    </section>
  )
}

function CartaoConectar({ pedindo, erro, onConectar }: { pedindo: boolean; erro: string | null; onConectar: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <p className="m-0 flex items-start gap-2.5 text-[13px] font-medium text-foreground">
        <ShieldAlert aria-hidden className="mt-px h-4 w-4 shrink-0 text-warn-foreground" strokeWidth={1.75} />
        <span>
          Use um <strong className="font-bold">chip só para prospecção</strong>. A conexão é pela via não oficial: o WhatsApp pode bloquear o
          número. O LeadNexi nunca manda mensagem sozinho nem em massa: cada envio é um clique seu.
        </span>
      </p>
      {erro && (
        <p role="alert" className="m-0 flex items-start gap-2 text-[13px] font-semibold text-leadnexi-danger">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
          {erro}
        </p>
      )}
      <div>
        <Button className={botaoPrincipalDoTopo} onClick={onConectar} disabled={pedindo}>
          {pedindo ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <WhatsAppLogo aria-hidden size={16} />}
          Conectar WhatsApp
        </Button>
      </div>
    </div>
  )
}

const PASSOS = ['Abra o WhatsApp no celular do chip de prospecção', 'Toque em Mais opções (⋮) ou Configurações › Aparelhos conectados', 'Toque em Conectar um aparelho e aponte a câmera para o código']

function CartaoQrCode({ qr, onCancelar }: { qr: string; onCancelar: () => void }) {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
      {/* O QR precisa de fundo branco para a câmera ler, nos dois temas */}
      <div className="grid shrink-0 place-items-center self-center rounded-xl bg-white p-3">
        <img src={qr} alt="QR code para conectar o WhatsApp" width={232} height={232} className="h-[232px] w-[232px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="m-0 flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Smartphone aria-hidden className="h-4 w-4 text-leadnexi-cyan-texto" strokeWidth={1.75} />
            Leia o código com o celular
          </p>
          <p className="m-0 mt-1 text-[13px] font-medium text-muted-foreground">O código se renova sozinho. Esta tela muda quando o celular conectar.</p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {PASSOS.map((passo, i) => (
            <li key={passo} className="flex items-start gap-3 text-[13px] font-medium text-foreground">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-leadnexi-violet/15 text-xs font-bold tabular-nums text-leadnexi-violet-texto">{i + 1}</span>
              <span className="pt-0.5">{passo}</span>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Esperando o celular…
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Número conectado e "Desconectar" (pede um segundo clique para confirmar). */
function CartaoConectado({ phone, name, onDesconectado }: { phone: string | null; name: string | null; onDesconectado: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [saindo, setSaindo] = useState(false)

  const sair = async () => {
    setSaindo(true)
    try {
      await desconectarWhatsApp()
      addToast('success', 'WhatsApp desconectado')
      onDesconectado()
    } catch {
      addToast('error', 'Não foi possível desconectar', 'Tente de novo.')
    } finally {
      setSaindo(false)
      setConfirmando(false)
    }
  }

  return (
    <section aria-label="WhatsApp conectado" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-whatsapp/15 text-whatsapp">
          <WhatsAppLogo aria-hidden size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-bold tabular-nums text-foreground">{phone ?? 'Número conectado'}</p>
          <p className="m-0 mt-0.5 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-success-foreground" />
            <span className="truncate">
              Conectado
              {name && <span className="hidden sm:inline"> · {name}</span>}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={saindo}
          onClick={() => (confirmando ? void sair() : setConfirmando(true))}
          onBlur={() => setConfirmando(false)}
          className={cn('gap-2', confirmando ? 'text-leadnexi-danger hover:text-leadnexi-danger' : 'text-muted-foreground')}
        >
          <LogOut aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          {confirmando ? 'Confirmar' : 'Desconectar'}
        </Button>
      </div>
    </section>
  )
}

function MensagemDeErro({ texto, onTentar }: { texto: string; onTentar: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-leadnexi-danger/40 bg-card p-4">
      <CircleAlert aria-hidden className="h-[18px] w-[18px] text-leadnexi-danger" strokeWidth={1.75} />
      <p className="m-0 flex-1 text-sm font-semibold text-foreground">{texto}</p>
      <Button variant="outline" size="sm" className={botaoSecundarioDoTopo} onClick={onTentar}>
        <RefreshCw aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Tentar de novo
      </Button>
    </div>
  )
}
