import { Toaster as SonnerToaster } from 'sonner'

/** Toasts no canto superior direito, com as cores de feedback do tema (igual ao Rizar). */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border border-border bg-card text-card-foreground shadow-lg rounded-lg',
          title: 'font-semibold text-sm',
          description: 'text-sm text-muted-foreground',
          success: 'border-success-border bg-success',
          error: 'border-error-border bg-error',
          warning: 'border-warn-border bg-warn',
          info: 'border-info-border bg-info',
        },
      }}
    />
  )
}
