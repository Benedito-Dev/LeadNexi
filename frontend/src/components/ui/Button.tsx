import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

const variants = {
  primary: 'bg-violet-600 text-on-accent',
  secondary: 'border border-navy-600 text-white hover:bg-navy-800',
  // Ação destrutiva: mesmo formato do secundário, texto na cor de erro (BRAND.md, seção 4.3)
  danger: 'border border-navy-600 text-danger hover:bg-navy-800',
}

// Botões da marca (BRAND.md, seção 8): altura 44, raio 12, texto 14/700.
export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-5 text-ui font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
