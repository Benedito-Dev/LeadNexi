import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormFieldProps = {
  label?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: ReactNode
}

/** Rótulo (com * quando obrigatório) e o campo logo abaixo. */
export function FormField({ label, required, htmlFor, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
      )}
      {children}
    </div>
  )
}
