import { cn } from '@/lib/utils'
import { personagemDo } from '../planta'

/**
 * O agente como personagem em pixel art (Pixel Office, de 2dPig, CC0). Na sala, ocupa a caixa de
 * quem o contém; no cartão, `altura` em px. Dormindo, fica com as cores mais fracas.
 */
export function Personagem({ character, dormindo = false, altura, className }: { character: string; dormindo?: boolean; altura?: number; className?: string }) {
  const { arquivo, largura, altura: alturaOriginal } = personagemDo(character)
  return (
    <img
      src={`/escritorio/personagens/${arquivo}.png`}
      alt=""
      draggable={false}
      className={cn('select-none [image-rendering:pixelated]', dormindo && 'saturate-[.6]', className)}
      style={altura ? { height: altura, width: (altura * largura) / alturaOriginal } : { width: '100%', height: '100%' }}
    />
  )
}
