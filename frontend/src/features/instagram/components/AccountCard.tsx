import { CircleAlert, LoaderCircle, LogOut } from 'lucide-react'
import { useState } from 'react'
import { InstagramIcon } from '../../../brand/icons.tsx'
import { Button } from '../../../components/ui/Button.tsx'
import { ApiError } from '../../../lib/api.ts'
import { useConnectInstagram, useDisconnectInstagram } from '../hooks.ts'
import type { InstagramAccount } from '../types.ts'

// Conta conectada: foto, @usuário, status e "Desconectar" (pede confirmação com um segundo clique).
// Se a Meta não aceita mais o token (revogado ou vencido), pede para conectar de novo.
export function AccountCard({ account }: { account: InstagramAccount }) {
  const disconnect = useDisconnectInstagram()
  const [confirming, setConfirming] = useState(false)

  return (
    <section aria-label="Conta do Instagram" className="rounded-xl border bg-navy-800 p-4">
      <div className="flex items-center gap-4">
        {account.profilePictureUrl ? (
          <img src={account.profilePictureUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-tint text-violet-300">
            <InstagramIcon aria-hidden size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-ui font-bold text-white">@{account.username}</p>
          <p className="mt-0.5 flex items-center gap-2 text-small text-slate-400">
            <span
              aria-hidden
              className={`size-2 shrink-0 rounded-full ${account.needsReconnect ? 'bg-warning' : 'bg-success'}`}
            />
            <span className="truncate">
              {account.needsReconnect ? 'Conexão expirada' : 'Conectado'}
              {/* No celular o status tem prioridade: o nome do perfil fica para telas maiores */}
              {account.name && <span className="hidden sm:inline"> · {account.name}</span>}
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={disconnect.isPending}
          onClick={() => (confirming ? disconnect.mutate() : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          title="Desconectar"
          className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3 text-small transition-colors hover:bg-navy-750 ${
            confirming ? 'text-danger' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <LogOut aria-hidden size={16} strokeWidth={1.75} />
          {/* No celular fica só o ícone (o texto segue para leitores de tela); "Confirmar" sempre aparece */}
          {confirming ? 'Confirmar' : <span className="sr-only sm:not-sr-only">Desconectar</span>}
        </button>
      </div>
      {account.needsReconnect && <Reconnect />}
    </section>
  )
}

function Reconnect() {
  const connect = useConnectInstagram()
  const error =
    connect.error instanceof ApiError && connect.error.status === 503
      ? 'A integração com o Instagram ainda não foi configurada no servidor.'
      : connect.error
        ? 'Não foi possível iniciar a conexão. Tente de novo.'
        : null

  return (
    <div className="mt-4 flex flex-col items-start gap-3 border-t pt-4">
      <p className="flex items-start gap-2 text-small text-slate-300">
        <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0 text-warning" />
        O Instagram não aceita mais o acesso do LeadNexi a esta conta. Conecte de novo para voltar a publicar.
      </p>
      <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
        {connect.isPending ? (
          <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <InstagramIcon aria-hidden size={18} />
        )}
        Conectar de novo
      </Button>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-small text-danger">
          <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
