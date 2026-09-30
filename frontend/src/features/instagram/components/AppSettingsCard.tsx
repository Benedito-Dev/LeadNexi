import { Check, CircleAlert, Copy, KeyRound, LoaderCircle, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button.tsx'
import { Field } from '../../../components/ui/Field.tsx'
import { Input } from '../../../components/ui/Input.tsx'
import { ApiError } from '../../../lib/api.ts'
import { useSaveInstagramSettings } from '../hooks.ts'
import type { InstagramAppSettings } from '../types.ts'

// App da Meta (BRAND.md, seção 9.5): ID e chave secreta do app usados no login do Instagram.
// Configurado: resumo com "Editar". Sem configuração (ou editando): formulário. A chave secreta
// nunca volta do servidor; o campo fica vazio e, se já houver uma salva, vazio = manter.
export function AppSettingsCard({ settings }: { settings: InstagramAppSettings }) {
  const [editing, setEditing] = useState(!settings.configured)

  if (!editing) {
    return (
      <section aria-label="App da Meta" className="flex items-center gap-4 rounded-xl border bg-navy-800 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-tint text-slate-300">
          <KeyRound aria-hidden size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ui font-bold text-white">App da Meta</p>
          <p className="mt-0.5 truncate text-small text-slate-400">
            ID <span className="tabular-nums">{settings.appId}</span> · chave secreta salva
            {settings.source === 'servidor' ? ' · pelas variáveis do servidor' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Editar app da Meta"
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3 text-small text-slate-400 transition-colors hover:bg-navy-750 hover:text-slate-300"
        >
          <Pencil aria-hidden size={16} strokeWidth={1.75} />
          <span className="sr-only sm:not-sr-only">Editar</span>
        </button>
      </section>
    )
  }

  return (
    <SettingsForm
      settings={settings}
      onSaved={() => setEditing(false)}
      onCancel={settings.configured ? () => setEditing(false) : undefined}
    />
  )
}

function SettingsForm({
  settings,
  onSaved,
  onCancel,
}: {
  settings: InstagramAppSettings
  onSaved: () => void
  /** Só quando já existe configuração para voltar */
  onCancel?: () => void
}) {
  const save = useSaveInstagramSettings()
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const appId = String(data.get('appId') ?? '').trim()
    const appSecret = String(data.get('appSecret') ?? '').trim()

    const invalid = !/^\d{5,30}$/.test(appId)
      ? 'O ID do app do Instagram tem só números.'
      : !appSecret && !settings.secretSaved
        ? 'Cole a chave secreta do app.'
        : appSecret && appSecret.length < 16
          ? 'A chave secreta parece incompleta.'
          : null
    setFieldError(invalid)
    if (invalid) return
    save.mutate({ appId, ...(appSecret ? { appSecret } : {}) }, { onSuccess: onSaved })
  }

  const error =
    fieldError ??
    (save.error instanceof ApiError && save.error.status > 0 && save.error.status < 500
      ? save.error.message
      : save.error
        ? 'Não foi possível salvar. Tente de novo.'
        : null)

  return (
    <section aria-labelledby="app-settings-title" className="rounded-xl border bg-navy-800 p-6 sm:p-8">
      <h2 id="app-settings-title" className="text-h2">
        {settings.configured ? 'App da Meta' : 'Configure o app da Meta'}
      </h2>
      <p className="mt-2 max-w-xl text-body text-slate-400">
        Copie o ID e a chave secreta no painel da Meta para Desenvolvedores: Casos de uso → API do Instagram →
        Configuração da API com login do Instagram.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <Field label="ID do app do Instagram" htmlFor="app-id">
          <Input
            id="app-id"
            name="appId"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={settings.appId ?? ''}
            placeholder="Só números"
            className="tabular-nums"
          />
        </Field>
        <Field
          label="Chave secreta do app do Instagram"
          htmlFor="app-secret"
          hint={settings.secretSaved ? 'Já existe uma chave salva. Deixe em branco para mantê-la.' : undefined}
        >
          <Input
            id="app-secret"
            name="appSecret"
            type="password"
            autoComplete="new-password"
            placeholder={settings.secretSaved ? 'Chave salva' : 'Cole a chave aqui'}
          />
        </Field>
        <RedirectUriField value={settings.redirectUri} />

        {error && (
          <p role="alert" className="flex items-start gap-2 text-small text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={save.isPending}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />}
            Salvar
          </Button>
        </div>
      </form>
    </section>
  )
}

/** Endereço de retorno, só leitura, com "Copiar": vai em "URLs de redirecionamento OAuth" na Meta. */
function RedirectUriField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem acesso à área de transferência: seleciona o texto para copiar à mão
      const input = document.getElementById('redirect-uri') as HTMLInputElement | null
      input?.select()
    }
  }

  return (
    <Field
      label="Endereço de retorno"
      htmlFor="redirect-uri"
      hint="Cole em “Configurar o login da empresa” → URLs de redirecionamento OAuth, no app da Meta."
    >
      <Input
        id="redirect-uri"
        readOnly
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        trailing={
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={copied ? 'Endereço copiado' : 'Copiar endereço'}
            title={copied ? 'Copiado' : 'Copiar'}
            className="grid size-9 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:text-slate-300"
          >
            {copied ? (
              <Check aria-hidden size={18} strokeWidth={1.75} className="text-success" />
            ) : (
              <Copy aria-hidden size={18} strokeWidth={1.75} />
            )}
          </button>
        }
      />
    </Field>
  )
}
