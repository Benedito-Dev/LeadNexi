import { WhatsAppLogo } from '@/brand/icons'
import { CanalInstagram } from '../instagram/CanalInstagram'

/** Configurações › Canais: um bloco por canal, todos no mesmo formato. */
export function CanaisPage() {
  return (
    <div className="flex flex-col gap-8">
      <CanalInstagram />
      {/* WhatsApp por API não oficial: etapa 7 do mapa (docs/produto/MAPA.md) */}
      <section aria-labelledby="canal-whatsapp" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-whatsapp/15 text-whatsapp">
            <WhatsAppLogo aria-hidden size={18} />
          </span>
          <div>
            <h2 id="canal-whatsapp" className="m-0 text-base font-extrabold text-foreground">WhatsApp</h2>
            <p className="m-0 text-[13px] font-medium text-muted-foreground">Hoje pelo botão que abre o WhatsApp com a mensagem pronta</p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm font-medium text-muted-foreground">
          Em construção · etapa 7 do mapa. Aqui você vai ler o QR code do celular para as conversas do WhatsApp chegarem em
          Conversas.
        </div>
      </section>
    </div>
  )
}
