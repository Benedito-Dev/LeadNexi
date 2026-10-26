import { CalendarClock, Check, Images, LoaderCircle, MessageCircle, ShieldCheck } from 'lucide-react'
import { InstagramIcon } from '@/brand/icons'
import { botaoPrincipalDoTopo } from '@/components/list-page/botoes'
import { Button } from '@/components/ui/button'
import { useConectar } from '../useConectar'
import { MensagemDeErro } from './CartaoAppDaMeta'

const VANTAGENS = [
  { Icone: MessageCircle, texto: 'Cada direct que chega vira lead no CRM' },
  { Icone: CalendarClock, texto: 'Agende posts para sair no minuto certo' },
  { Icone: Images, texto: 'Foto única ou carrossel com até 10 imagens' },
  { Icone: Check, texto: 'Funciona com conta profissional (Empresa ou Criador)' },
]

/** Convite para conectar. Sem o app da Meta configurado, o botão fica desativado e aponta para o cartão acima. */
export function CartaoConectar({ configurado }: { configurado: boolean }) {
  const { conectar, conectando, erro } = useConectar()

  return (
    <section aria-labelledby="conectar" className="rounded-xl border border-border bg-card p-6">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-leadnexi-violet/15 text-leadnexi-violet-texto">
        <InstagramIcon aria-hidden size={24} />
      </span>
      <h2 id="conectar" className="mb-0 mt-4 text-lg font-extrabold tracking-[-0.02em] text-foreground">
        Conecte seu Instagram
      </h2>
      <p className="mb-0 mt-1 max-w-lg text-sm font-medium text-muted-foreground">
        Receba os directs como leads e publique fotos e carrosséis direto do LeadNexi, sem abrir o app do Instagram.
      </p>

      <ul className="mb-0 mt-5 flex flex-col gap-2.5 p-0">
        {VANTAGENS.map(({ Icone, texto }) => (
          <li key={texto} className="flex items-center gap-3 text-sm font-medium text-foreground">
            <Icone aria-hidden className="h-[18px] w-[18px] shrink-0 text-leadnexi-cyan-texto" strokeWidth={1.75} />
            {texto}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col items-start gap-3">
        <Button className={botaoPrincipalDoTopo} onClick={() => void conectar()} disabled={!configurado || conectando}>
          {conectando ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <InstagramIcon aria-hidden size={18} />}
          Conectar Instagram
        </Button>
        {configurado ? (
          <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <ShieldCheck aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Você entra pelo login oficial do Instagram. O LeadNexi nunca vê sua senha.
          </p>
        ) : (
          <p className="m-0 text-[13px] font-medium text-muted-foreground">Salve o app da Meta acima para liberar a conexão.</p>
        )}
        {erro && <MensagemDeErro texto={erro} />}
      </div>
    </section>
  )
}
