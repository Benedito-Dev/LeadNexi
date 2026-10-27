import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Foto redonda com a inicial no lugar quando não há foto ou o link não carrega (links de foto da
 * Meta expiram em poucos dias).
 */
export function FotoRedonda({ src, nome, className }: { src: string | null | undefined; nome: string; className?: string }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full font-bold', className)}>
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhou(true)} className="h-full w-full object-cover" />
      ) : (
        nome.replace(/^@/, '').charAt(0).toUpperCase()
      )}
    </span>
  )
}
