import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  default: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[90vw]',
}

type MutaseDialogProps = {
  open: boolean
  onOpenChange: (aberto: boolean) => void
  title?: string
  /** Texto (ou conteúdo, como etiquetas) logo abaixo do título. */
  description?: ReactNode
  size?: keyof typeof SIZE_CLASSES
  className?: string
  children: ReactNode
}

/** Modal padrão do Rizar: tamanho por nome, título e descrição (lida por leitor de tela). */
function MutaseDialog({ open, onOpenChange, title, description, size = 'default', className, children }: MutaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(SIZE_CLASSES[size], className)}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}

function MutaseDialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('py-4', className)}>{children}</div>
}

function MutaseDialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <DialogFooter className={className}>{children}</DialogFooter>
}

MutaseDialog.Body = MutaseDialogBody
MutaseDialog.Footer = MutaseDialogFooter

export { MutaseDialog }
