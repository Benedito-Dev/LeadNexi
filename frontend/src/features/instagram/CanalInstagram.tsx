import { useCallback, useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { InstagramIcon } from '@/brand/icons'
import { botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buscarAppDaMeta, buscarConta } from './api'
import { CartaoAppDaMeta } from './components/CartaoAppDaMeta'
import { CartaoConectar } from './components/CartaoConectar'
import { CartaoConta } from './components/CartaoConta'
import type { AppDaMeta, SituacaoDaConta } from './tipos'

/** Mensagens da volta do login do Instagram (?conectado=1 ou ?erro=...). */
const ERROS_DA_VOLTA: Record<string, string> = {
  negado: 'A conexão foi cancelada no Instagram.',
  conta: 'Essa conta não é profissional. Mude para Empresa ou Criador no app do Instagram e tente de novo.',
  expirado: 'O tempo para concluir a conexão acabou. Clique em "Conectar Instagram" de novo.',
  falha: 'Não foi possível conectar o Instagram. Tente de novo.',
}

/** Canal Instagram (Configurações › Canais): app da Meta, conectar a conta e a situação da conexão. */
export function CanalInstagram() {
  const [conta, setConta] = useState<SituacaoDaConta | null>(null)
  const [app, setApp] = useState<AppDaMeta | null>(null)
  const [erro, setErro] = useState(false)
  const [params, setParams] = useSearchParams()
  const volta = params.get('conectado') === '1' ? 'ok' : params.get('erro')

  const carregar = useCallback(async () => {
    setErro(false)
    try {
      const [situacao, configuracao] = await Promise.all([buscarConta(), buscarAppDaMeta()])
      setConta(situacao)
      setApp(configuracao)
    } catch {
      setErro(true)
    }
  }, [])

  useEffect(() => {
    Promise.all([buscarConta(), buscarAppDaMeta()])
      .then(([situacao, configuracao]) => {
        setConta(situacao)
        setApp(configuracao)
      })
      .catch(() => setErro(true))
  }, [])

  return (
    <section aria-labelledby="canal-instagram" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-leadnexi-violet/15 text-leadnexi-violet-texto">
          <InstagramIcon aria-hidden size={18} />
        </span>
        <div>
          <h2 id="canal-instagram" className="m-0 text-base font-extrabold text-foreground">Instagram</h2>
          <p className="m-0 text-[13px] font-medium text-muted-foreground">
            {conta?.connected ? `@${conta.account.username}` : 'Receba os directs como leads e publique posts'}
          </p>
        </div>
      </div>

      {volta && (
        <Aviso
          ok={volta === 'ok'}
          texto={volta === 'ok' ? 'Instagram conectado.' : (ERROS_DA_VOLTA[volta] ?? ERROS_DA_VOLTA.falha)}
          onFechar={() => setParams({}, { replace: true })}
        />
      )}

      {erro ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-leadnexi-danger/40 bg-card p-6">
          <p className="m-0 text-sm font-bold text-foreground">Não foi possível carregar a conta do Instagram.</p>
          <Button variant="outline" size="sm" className={botaoSecundarioDoTopo} onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </div>
      ) : !conta || !app ? (
        <div aria-busy="true" aria-label="Carregando conta" className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      ) : conta.connected ? (
        <div className="flex flex-col gap-4">
          <CartaoConta conta={conta.account} onDesconectado={() => setConta({ connected: false })} />
          {/* Dá para trocar o app da Meta a qualquer hora (ex.: nova chave secreta) */}
          <CartaoAppDaMeta app={app} onSalvo={setApp} />
        </div>
      ) : (
        // Passo 1: app da Meta · Passo 2: conectar a conta
        <div className="flex flex-col gap-4">
          <CartaoAppDaMeta app={app} onSalvo={setApp} />
          <CartaoConectar configurado={app.configured} />
        </div>
      )}
    </section>
  )
}

/** Faixa de aviso fechável (volta do login do Instagram). */
function Aviso({ ok, texto, onFechar }: { ok: boolean; texto: string; onFechar: () => void }) {
  const Icone = ok ? CircleCheck : CircleAlert
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-semibold',
        ok ? 'border-success/40 text-success' : 'border-leadnexi-danger/40 text-leadnexi-danger',
      )}
    >
      <Icone aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <p className="m-0 flex-1">{texto}</p>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
        <X aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
