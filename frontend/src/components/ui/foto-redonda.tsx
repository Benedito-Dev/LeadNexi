import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Foto redonda com a inicial no lugar quando não há foto ou o link não carrega (links de foto da
 * Meta expiram em poucos dias).
 */
export function FotoRedonda({ src, nome, className }: { src: string | null | undefined; nome: string; className?: string }) {
  // Guarda QUAL link falhou: chegando um link novo (foto atualizada), tenta de novo
  const [falhouEm, setFalhouEm] = useState<string | null>(null)
  const falhou = Boolean(src) && falhouEm === src
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full font-bold', className)}>
      {src && !falhou ? (
        <img src={src} alt="" onError={() => setFalhouEm(src)} className="h-full w-full object-cover" />
      ) : (
        nome.replace(/^@/, '').charAt(0).toUpperCase()
      )}
    </span>
  )
}
