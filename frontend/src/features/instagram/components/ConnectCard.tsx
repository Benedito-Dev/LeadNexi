import { CalendarClock, Check, CircleAlert, Images, LoaderCircle, ShieldCheck } from 'lucide-react'
import { InstagramIcon } from '../../../brand/icons.tsx'
import { Button } from '../../../components/ui/Button.tsx'
import { ApiError } from '../../../lib/api.ts'
import { useConnectInstagram } from '../hooks.ts'

const BENEFITS = [
  { icon: CalendarClock, text: 'Agende posts para sair no minuto certo' },
  { icon: Images, text: 'Foto única ou carrossel com até 10 imagens' },
  { icon: Check, text: 'Funciona com conta profissional (Empresa ou Criador)' },
]

// Convite para conectar (BRAND.md, seção 9.5): sem conta conectada, é a primeira coisa da tela.
export function ConnectCard() {
  const connect = useConnectInstagram()
  const error =
    connect.error instanceof ApiError && connect.error.status === 503
      ? 'A integração com o Instagram ainda não foi configurada no servidor.'
      : connect.error
        ? 'Não foi possível iniciar a conexão. Tente de novo.'
        : null

  return (
    <section aria-labelledby="connect-title" className="rounded-xl border bg-navy-800 p-6 sm:p-8">
      <span className="grid size-12 place-items-center rounded-full bg-violet-tint text-violet-300">
        <InstagramIcon aria-hidden size={24} />
      </span>
      <h2 id="connect-title" className="mt-5 text-h2">
        Conecte seu Instagram
      </h2>
      <p className="mt-2 max-w-lg text-body text-slate-400">
        Publique fotos e carrosséis direto do LeadNexi, no horário que você escolher. Sem abrir o app do Instagram.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-ui text-slate-300">
            <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-cyan" />
            {text}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-start gap-3">
        <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
          {connect.isPending ? (
            <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <InstagramIcon aria-hidden size={18} />
          )}
          Conectar Instagram
        </Button>
        <p className="flex items-center gap-2 text-small text-slate-400">
          <ShieldCheck aria-hidden size={16} strokeWidth={1.75} className="shrink-0" />
          Você entra pelo login oficial do Instagram. O LeadNexi nunca vê sua senha.
        </p>
        {error && (
          <p role="alert" className="flex items-start gap-2 text-small text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
