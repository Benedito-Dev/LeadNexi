// LeadNexi — símbolo em React. Fundo transparente (respiros via máscara).
import { useId } from 'react';

type Variant = 'auto' | 'dark' | 'light' | 'mono-white' | 'mono-navy';

const COLORS: Record<Variant, { pillar: string; bridge: string }> = {
  auto: { pillar: '#6D5DFB', bridge: 'var(--lnx-logo-bridge)' }, // segue o tema (dark/light)
  dark: { pillar: '#6D5DFB', bridge: '#22D3EE' },        // sobre fundo escuro
  light: { pillar: '#6D5DFB', bridge: '#0891B2' },       // sobre fundo claro
  'mono-white': { pillar: '#F8FAFC', bridge: '#F8FAFC' },
  'mono-navy': { pillar: '#0B1020', bridge: '#0B1020' },
};

export function LeadNexiMark({ size = 32, variant = 'auto' }: { size?: number; variant?: Variant }) {
  const id = useId().replace(/:/g, '');
  const { pillar, bridge } = COLORS[variant];
  const compact = size <= 32; // abaixo de 32px: versão reduzida, sem respiros nem nós

  if (compact) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M10 16A6 6 0 0 1 22 16V42H26A6 6 0 0 1 26 54H16A6 6 0 0 1 10 48Z" fill={pillar} />
        <rect x="42" y="10" width="12" height="44" rx="6" fill={pillar} />
        <path d="M16 16L48 48" style={{ stroke: bridge }} strokeWidth="10" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <mask id={`gap-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d="M16 16L48 48" stroke="#000" strokeWidth="14" strokeLinecap="round" />
          <circle cx="16" cy="16" r="10" fill="#000" />
          <circle cx="48" cy="48" r="10" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#gap-${id})`} fill={pillar}>
        <path d="M10 16A6 6 0 0 1 22 16V42H26A6 6 0 0 1 26 54H16A6 6 0 0 1 10 48Z" />
        <rect x="42" y="10" width="12" height="44" rx="6" />
      </g>
      <path d="M16 16L48 48" style={{ stroke: bridge }} strokeWidth="8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="7" style={{ fill: bridge }} />
      <circle cx="48" cy="48" r="7" style={{ fill: bridge }} />
    </svg>
  );
}

export function LeadNexiLogo({ size = 32, variant = 'auto' }: { size?: number; variant?: Variant }) {
  const textColor =
    variant === 'auto' ? 'var(--lnx-logo-text)' : variant === 'light' || variant === 'mono-navy' ? '#0B1020' : '#F8FAFC';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3 }}>
      <LeadNexiMark size={size} variant={variant} />
      <span style={{ fontFamily: 'Manrope, system-ui, sans-serif', fontWeight: 800, fontSize: size * 0.72,
        letterSpacing: '-0.045em', lineHeight: 1, color: textColor }}>LeadNexi</span>
    </span>
  );
}
