import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

// Ícones próprios (BRAND.md, seção 7), no mesmo traço dos ícones Lucide: grade 24, traço 1.75,
// pontas arredondadas, cor herdada (currentColor).
function LineIcon({ size = 24, strokeWidth = 1.75, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Funil / kanban. */
export function KanbanIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </LineIcon>
  )
}

// Marcas de canal: o Lucide não tem ícones de marca. Traços adaptados do Tabler Icons (MIT).

/** Instagram. */
export function InstagramIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
      <path d="M16.5 7.5v.01" />
    </LineIcon>
  )
}

/** WhatsApp. */
export function WhatsAppIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </LineIcon>
  )
}
