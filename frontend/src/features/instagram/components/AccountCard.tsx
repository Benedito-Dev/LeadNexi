import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { InstagramIcon } from '../../../brand/icons.tsx'
import { useDisconnectInstagram } from '../hooks.ts'
import type { InstagramAccount } from '../types.ts'

// Conta conectada: foto, @usuário, status e "Desconectar" (pede confirmação com um segundo clique).
export function AccountCard({ account }: { account: InstagramAccount }) {
  const disconnect = useDisconnectInstagram()
  const [confirming, setConfirming] = useState(false)

  return (
    <section aria-label="Conta do Instagram" className="flex items-center gap-4 rounded-xl border bg-navy-800 p-4">
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
          <span aria-hidden className="size-2 rounded-full bg-success" />
          Conectado{account.name ? ` · ${account.name}` : ''}
        </p>
      </div>
      <button
        type="button"
        disabled={disconnect.isPending}
        onClick={() => (confirming ? disconnect.mutate() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3 text-small transition-colors hover:bg-navy-750 ${
          confirming ? 'text-danger' : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        <LogOut aria-hidden size={16} strokeWidth={1.75} />
        {confirming ? 'Confirmar' : 'Desconectar'}
      </button>
    </section>
  )
}
