import { CanalInstagram } from '../instagram/CanalInstagram'
import { CanalWhatsApp } from '../whatsapp/CanalWhatsApp'

/** Configurações › Canais: um bloco por canal, todos no mesmo formato. */
export function CanaisPage() {
  return (
    <div className="flex flex-col gap-8">
      <CanalInstagram />
      <CanalWhatsApp />
    </div>
  )
}
