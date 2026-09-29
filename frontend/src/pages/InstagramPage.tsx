import { CalendarClock, CircleAlert, CircleCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader.tsx'
import { Button } from '../components/ui/Button.tsx'
import { AccountCard } from '../features/instagram/components/AccountCard.tsx'
import { ConnectCard } from '../features/instagram/components/ConnectCard.tsx'
import { PostComposer } from '../features/instagram/components/PostComposer.tsx'
import { useInstagramAccount } from '../features/instagram/hooks.ts'

/** Mensagens da volta do login do Instagram (?conectado=1 ou ?erro=...) */
const RETURN_ERRORS: Record<string, string> = {
  negado: 'A conexão foi cancelada no Instagram.',
  conta: 'Essa conta não é profissional. Mude para Empresa ou Criador no app do Instagram e tente de novo.',
  falha: 'Não foi possível conectar o Instagram. Tente de novo.',
}

// Tela Instagram (BRAND.md, seção 9.5): conectar a conta, montar e agendar posts.
export function InstagramPage() {
  const account = useInstagramAccount()
  const [composerOpen, setComposerOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const connected = account.data?.connected === true

  const returned = params.get('conectado') === '1' ? 'ok' : params.get('erro')
  const dismissReturn = () => setParams({}, { replace: true })

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Instagram"
        description="Agende e publique fotos e carrosséis no seu perfil."
        actions={
          <Button variant={connected ? 'primary' : 'secondary'} onClick={() => setComposerOpen(true)}>
            <Plus aria-hidden size={18} strokeWidth={1.75} />
            Novo post
          </Button>
        }
      />

      {returned && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-md border px-4 py-3 text-small ${
            returned === 'ok' ? 'text-success' : 'text-danger'
          }`}
        >
          {returned === 'ok' ? (
            <CircleCheck aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
          ) : (
            <CircleAlert aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
          )}
          <p className="flex-1">
            {returned === 'ok' ? 'Instagram conectado.' : (RETURN_ERRORS[returned] ?? RETURN_ERRORS.falha)}
          </p>
          <button type="button" onClick={dismissReturn} className="cursor-pointer text-slate-400 hover:text-slate-300">
            Fechar
          </button>
        </div>
      )}

      {account.isPending ? (
        <div aria-busy="true" aria-label="Carregando conta" className="h-40 animate-pulse rounded-xl border bg-navy-800" />
      ) : account.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-slate-400">Não foi possível carregar a conta do Instagram.</p>
          <Button variant="secondary" onClick={() => void account.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : account.data.connected ? (
        <>
          <AccountCard account={account.data.account} />
          <section aria-labelledby="posts-title" className="flex flex-col gap-3">
            <h2 id="posts-title" className="text-ui font-bold text-white">
              Posts agendados
            </h2>
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed px-6 py-10">
              <CalendarClock aria-hidden size={22} strokeWidth={1.75} className="text-slate-400" />
              <p className="text-ui font-bold text-white">Nenhum post agendado ainda.</p>
              <p className="text-small text-slate-400">Clique em "Novo post" para montar o primeiro.</p>
            </div>
          </section>
        </>
      ) : (
        <ConnectCard />
      )}

      <PostComposer open={composerOpen} connected={connected} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
