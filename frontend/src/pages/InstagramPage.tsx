import { CircleAlert, CircleCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { AccountCard } from '../features/instagram/components/AccountCard.tsx'
import { AppSettingsCard } from '../features/instagram/components/AppSettingsCard.tsx'
import { ConnectCard } from '../features/instagram/components/ConnectCard.tsx'
import { PostComposer } from '../features/instagram/components/PostComposer.tsx'
import { PostList } from '../features/instagram/components/PostList.tsx'
import { ViewToggle } from '../features/instagram/components/ViewToggle.tsx'
import { useInstagramAccount, useInstagramPublishing, useInstagramSettings } from '../features/instagram/hooks.ts'
import type { CreatedInstagramPost } from '../features/instagram/types.ts'
import { usePostView } from '../features/instagram/view.ts'
import { formatDateTime } from '../lib/format.ts'

/** Mensagens da volta do login do Instagram (?conectado=1 ou ?erro=...) */
const RETURN_ERRORS: Record<string, string> = {
  negado: 'A conexão foi cancelada no Instagram.',
  conta: 'Essa conta não é profissional. Mude para Empresa ou Criador no app do Instagram e tente de novo.',
  expirado: 'O tempo para concluir a conexão acabou. Clique em "Conectar Instagram" de novo.',
  falha: 'Não foi possível conectar o Instagram. Tente de novo.',
}

// Tela Instagram (BRAND.md, seção 9.5): conectar a conta, montar e agendar posts.
export function InstagramPage() {
  const account = useInstagramAccount()
  const settings = useInstagramSettings()
  const [composerOpen, setComposerOpen] = useState(false)
  const [view, setView] = usePostView()
  const [params, setParams] = useSearchParams()
  // Conta conectada e com token valendo: só assim dá para publicar
  const canPublish = account.data?.connected === true && !account.data.account.needsReconnect

  const returned = params.get('conectado') === '1' ? 'ok' : params.get('erro')
  const dismissReturn = () => setParams({}, { replace: true })
  // Aviso depois de agendar ou publicar ("Post agendado para amanhã às 09:00.")
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Instagram"
        description="Agende e publique fotos e carrosséis no seu perfil."
        actions={
          <Button variant={canPublish ? 'primary' : 'secondary'} onClick={() => setComposerOpen(true)}>
            <Plus aria-hidden size={18} strokeWidth={1.75} />
            Novo post
          </Button>
        }
      />

      {returned && (
        <Banner
          ok={returned === 'ok'}
          message={returned === 'ok' ? 'Instagram conectado.' : (RETURN_ERRORS[returned] ?? RETURN_ERRORS.falha)}
          onClose={dismissReturn}
        />
      )}
      {notice && <Banner ok={notice.ok} message={notice.message} onClose={() => setNotice(null)} />}

      {account.isPending || settings.isPending ? (
        <div aria-busy="true" aria-label="Carregando conta" className="h-40 animate-pulse rounded-xl border bg-navy-800" />
      ) : account.isError || settings.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-slate-400">Não foi possível carregar a conta do Instagram.</p>
          <Button
            variant="secondary"
            onClick={() => void (account.isError ? account.refetch() : settings.refetch())}
          >
            Tentar de novo
          </Button>
        </div>
      ) : account.data.connected ? (
        <>
          <AccountCard account={account.data.account} />
          <section aria-labelledby="posts-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 id="posts-title" className="text-ui font-bold text-white">
                Posts
              </h2>
              <div className="flex items-center gap-4">
                <AutoPublishStatus />
                <ViewToggle view={view} onChange={setView} />
              </div>
            </div>
            <PostList view={view} />
          </section>
          {/* Dá para trocar o app da Meta a qualquer hora (ex.: nova chave secreta) */}
          <AppSettingsCard settings={settings.data} />
        </>
      ) : (
        <>
          {/* Passo 1: app da Meta · Passo 2: conectar a conta */}
          <AppSettingsCard settings={settings.data} />
          <ConnectCard configured={settings.data.configured} />
        </>
      )}

      <PostComposer
        open={composerOpen}
        connected={canPublish}
        onClose={() => setComposerOpen(false)}
        onCreated={(post) => {
          setComposerOpen(false)
          setNotice(createdNotice(post))
        }}
      />
    </div>
  )
}

/** Aviso depois de criar o post: agendado, publicado, ou recusado pelo Instagram (fica na lista com "Tentar de novo"). */
function createdNotice(post: CreatedInstagramPost) {
  if (post.status === 'PUBLISHED') return { ok: true, message: 'Post publicado no Instagram.' }
  if (post.status === 'FAILED') return { ok: false, message: `Post não publicado. ${post.error ?? ''}`.trim() }
  const when = formatDateTime(post.scheduledAt).toLowerCase()
  if (post.alarmFailed) {
    return {
      ok: false,
      message: `Post agendado para ${when}, mas o despertador da publicação não respondeu. Ele pode não sair sozinho: use "Publicar agora" na hora.`,
    }
  }
  return { ok: true, message: `Post agendado para ${when}.` }
}

/**
 * Se os agendados saem sozinhos na hora marcada (despertador configurado no servidor). Desligada,
 * só "Publicar agora" publica (a lista avisa).
 */
function AutoPublishStatus() {
  const publishing = useInstagramPublishing()
  if (!publishing.data) return null
  const on = publishing.data.automatic
  return (
    <p className="flex items-center gap-2 text-small text-slate-400">
      <span aria-hidden className={`size-2 rounded-full ${on ? 'bg-success' : 'bg-warning'}`} />
      {on ? 'Publicação automática ligada' : 'Publicação automática desligada'}
    </p>
  )
}

/** Faixa de aviso fechável no topo (volta do login, post agendado ou publicado). */
function Banner({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-md border px-4 py-3 text-small ${ok ? 'text-success' : 'text-danger'}`}
    >
      {ok ? (
        <CircleCheck aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
      ) : (
        <CircleAlert aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
      )}
      <p className="flex-1">{message}</p>
      <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-300">
        Fechar
      </button>
    </div>
  )
}
