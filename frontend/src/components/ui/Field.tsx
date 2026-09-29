import type { ComponentProps, ReactNode } from 'react'

// Mesma aparência do <Input> (BRAND.md, seção 8), para select e textarea.
const controlClass =
  'w-full rounded-md border bg-navy-800 px-3.5 text-body text-white placeholder:text-slate-400 aria-[invalid=true]:border-danger'

/** Rótulo + campo, com dica opcional abaixo. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-small text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-small font-medium text-slate-400">{hint}</p>}
    </div>
  )
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`h-11 cursor-pointer ${controlClass} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`min-h-24 resize-y py-2.5 ${controlClass} ${className}`} {...props} />
}
