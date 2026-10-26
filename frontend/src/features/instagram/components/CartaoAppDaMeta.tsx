import { useState, type FormEvent } from 'react'
import { Check, CircleAlert, Copy, KeyRound, LoaderCircle, Pencil } from 'lucide-react'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErroDeApi } from '@/lib/api'
import { salvarAppDaMeta } from '../api'
import type { AppDaMeta } from '../tipos'

/**
 * App da Meta: ID e chave secreta do app usados no login do Instagram. Configurado, mostra o
 * resumo com "Editar"; sem configuração (ou editando), o formulário. A chave secreta nunca volta
 * do servidor: o campo fica vazio e, se já houver uma salva, vazio = manter.
 */
export function CartaoAppDaMeta({ app, onSalvo }: { app: AppDaMeta; onSalvo: (app: AppDaMeta) => void }) {
  const [editando, setEditando] = useState(!app.configured)

  if (!editando) {
    return (
      <section aria-label="App da Meta" className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <KeyRound aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-bold text-foreground">App da Meta</p>
          <p className="m-0 mt-0.5 truncate text-[13px] font-medium text-muted-foreground">
            ID <span className="tabular-nums">{app.appId}</span> · chave secreta salva
            {app.source === 'servidor' ? ' · pelas variáveis do servidor' : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setEditando(true)}>
          <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Editar
        </Button>
      </section>
    )
  }

  return (
    <Formulario
      app={app}
      onSalvo={(salvo) => {
        setEditando(false)
        onSalvo(salvo)
      }}
      onCancelar={app.configured ? () => setEditando(false) : undefined}
    />
  )
}

function Formulario({ app, onSalvo, onCancelar }: { app: AppDaMeta; onSalvo: (app: AppDaMeta) => void; onCancelar?: () => void }) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const appId = String(dados.get('appId') ?? '').trim()
    const appSecret = String(dados.get('appSecret') ?? '').trim()
    const invalido = !/^\d{5,30}$/.test(appId)
      ? 'O ID do app do Instagram tem só números.'
      : !appSecret && !app.secretSaved
        ? 'Cole a chave secreta do app.'
        : appSecret && appSecret.length < 16
          ? 'A chave secreta parece incompleta.'
          : null
    setErro(invalido)
    if (invalido) return
    setSalvando(true)
    try {
      onSalvo(await salvarAppDaMeta({ appId, ...(appSecret ? { appSecret } : {}) }))
    } catch (e) {
      setErro(e instanceof ErroDeApi && e.status !== null && e.status < 500 ? e.message : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section aria-labelledby="app-da-meta" className="rounded-xl border border-border bg-card p-6">
      <h2 id="app-da-meta" className="m-0 text-lg font-extrabold tracking-[-0.02em] text-foreground">
        {app.configured ? 'App da Meta' : 'Configure o app da Meta'}
      </h2>
      <p className="mb-0 mt-1 max-w-xl text-sm font-medium text-muted-foreground">
        Copie o ID e a chave secreta no painel da Meta para Desenvolvedores: Casos de uso → API do Instagram → Configuração da API
        com login do Instagram.
      </p>

      <form noValidate onSubmit={(e) => void enviar(e)} className="mt-5 flex flex-col gap-4">
        <Campo id="app-id" rotulo="ID do app do Instagram">
          <Input id="app-id" name="appId" inputMode="numeric" autoComplete="off" defaultValue={app.appId ?? ''} placeholder="Só números" className="tabular-nums" />
        </Campo>
        <Campo id="app-secret" rotulo="Chave secreta do app do Instagram" dica={app.secretSaved ? 'Já existe uma chave salva. Deixe em branco para mantê-la.' : undefined}>
          <Input id="app-secret" name="appSecret" type="password" autoComplete="new-password" placeholder={app.secretSaved ? 'Chave salva' : 'Cole a chave aqui'} />
        </Campo>
        <CampoCopiar
          id="redirect-uri"
          rotulo="Endereço de retorno"
          valor={app.redirectUri}
          dica="Cole em “Configurar o login da empresa” → URLs de redirecionamento OAuth, no app da Meta."
        />

        {/* Direct vira lead: o que vai em "Configurar webhooks" no app da Meta */}
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div>
            <h3 className="m-0 text-sm font-bold text-foreground">Direct do Instagram</h3>
            <p className="mb-0 mt-1 text-[13px] font-medium text-muted-foreground">
              Para cada direct virar lead: no app da Meta, em “Configurar webhooks”, cole os dois valores abaixo, clique em
              “Verificar e salvar” e ative o campo “messages”.
            </p>
          </div>
          <CampoCopiar id="webhook-url" rotulo="URL de callback" valor={app.webhookUrl} dica="Endereço que recebe os avisos de mensagem da Meta." />
          {app.webhookVerifyToken && (
            <CampoCopiar id="webhook-token" rotulo="Token de verificação" valor={app.webhookVerifyToken} dica="A Meta manda de volta ao salvar, e o LeadNexi confere." />
          )}
        </div>

        {erro && <MensagemDeErro texto={erro} />}

        <div className="flex flex-wrap justify-end gap-2">
          {onCancelar && (
            <Button type="button" variant="outline" className={botaoSecundarioDoTopo} onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
          )}
          <Button type="submit" className={botaoPrincipalDoTopo} disabled={salvando}>
            {salvando && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />}
            Salvar
          </Button>
        </div>
      </form>
    </section>
  )
}

function Campo({ id, rotulo, dica, children }: { id: string; rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        {rotulo}
      </Label>
      {children}
      {dica && <p className="m-0 text-xs font-medium text-muted-foreground">{dica}</p>}
    </div>
  )
}

/** Campo só de leitura com "Copiar": valores que vão no painel da Meta. */
function CampoCopiar({ id, rotulo, valor, dica }: { id: string; rotulo: string; valor: string; dica: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sem acesso à área de transferência: seleciona o texto para copiar à mão
      ;(document.getElementById(id) as HTMLInputElement | null)?.select()
    }
  }

  return (
    <Campo id={id} rotulo={rotulo} dica={dica}>
      <div className="relative">
        <Input id={id} readOnly value={valor} onFocus={(e) => e.currentTarget.select()} className="pr-12 font-mono text-[13px]" />
        <button
          type="button"
          onClick={() => void copiar()}
          aria-label={copiado ? `${rotulo}: copiado` : `Copiar ${rotulo.toLowerCase()}`}
          title={copiado ? 'Copiado' : 'Copiar'}
          className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copiado ? <Check aria-hidden className="h-4 w-4 text-success" strokeWidth={1.75} /> : <Copy aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
        </button>
      </div>
    </Campo>
  )
}

export function MensagemDeErro({ texto }: { texto: string }) {
  return (
    <p role="alert" className="m-0 flex items-start gap-2 text-[13px] font-medium text-leadnexi-danger">
      <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
      {texto}
    </p>
  )
}
