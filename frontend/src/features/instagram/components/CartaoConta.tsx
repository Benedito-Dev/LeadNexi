import { useState } from 'react'
import { CircleAlert, LoaderCircle, LogOut, MessageCircle } from 'lucide-react'
import { InstagramIcon } from '@/brand/icons'
import { botaoPrincipalDoTopo, botaoSecundarioDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { desconectar } from '../api'
import type { ContaDoInstagram } from '../tipos'
import { useConectar } from '../useConectar'
import { MensagemDeErro } from './CartaoAppDaMeta'

/**
 * Conta conectada: foto, @usuário, situação e "Desconectar" (pede um segundo clique para confirmar).
 * Se a Meta não aceita mais o token, pede para conectar de novo; se o direct ainda não vira lead
 * (conexão sem a permissão de mensagens), convida a conectar de novo.
 */
export function CartaoConta({ conta, onDesconectado }: { conta: ContaDoInstagram; onDesconectado: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [saindo, setSaindo] = useState(false)

  const sair = async () => {
    setSaindo(true)
    try {
      await desconectar()
      onDesconectado()
    } catch {
      addToast('error', 'Não foi possível desconectar', 'Tente de novo.')
      setSaindo(false)
    }
  }

  return (
    <section aria-label="Conta do Instagram" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        {conta.profilePictureUrl ? (
          <img src={conta.profilePictureUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-leadnexi-violet/15 text-leadnexi-violet-texto">
            <InstagramIcon aria-hidden size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-bold text-foreground">@{conta.username}</p>
          <p className="m-0 mt-0.5 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', conta.needsReconnect ? 'bg-warn-foreground' : 'bg-success')} />
            <span className="truncate">
              {conta.needsReconnect ? 'Conexão expirada' : 'Conectado'}
              {conta.name && <span className="hidden sm:inline"> · {conta.name}</span>}
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
      {conta.needsReconnect ? <ConectarDeNovo /> : !conta.messagesEnabled && <ConectarDeNovo paraMensagens />}
    </section>
  )
}

/** "Conectar de novo": conexão expirada (aviso) ou para ligar o direct (convite). */
function ConectarDeNovo({ paraMensagens = false }: { paraMensagens?: boolean }) {
  const { conectar, conectando, erro } = useConectar()

  return (
    <div className="mt-4 flex flex-col items-start gap-3 border-t border-border pt-4">
      {paraMensagens ? (
        <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-foreground">
          <MessageCircle aria-hidden className="mt-px h-4 w-4 shrink-0 text-leadnexi-cyan-texto" strokeWidth={1.75} />
          Para cada direct virar lead, conecte de novo e aceite a permissão de mensagens (e configure o webhook no cartão “App da
          Meta”).
        </p>
      ) : (
        <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-foreground">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0 text-warn-foreground" strokeWidth={1.75} />
          O Instagram não aceita mais o acesso do LeadNexi a esta conta. Conecte de novo para voltar a receber directs e publicar.
        </p>
      )}
      <Button
        variant={paraMensagens ? 'outline' : 'default'}
        className={paraMensagens ? botaoSecundarioDoTopo : botaoPrincipalDoTopo}
        onClick={() => void conectar()}
        disabled={conectando}
      >
        {conectando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <InstagramIcon aria-hidden size={18} />}
        Conectar de novo
      </Button>
      {erro && <MensagemDeErro texto={erro} />}
    </div>
  )
}
