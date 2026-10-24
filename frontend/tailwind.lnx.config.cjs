// Tema da marca LeadNexi, usado só pela tela de login (que voltou da branch backup/main-2026-10-23).
// É o mesmo tema do front antigo (Tailwind v4, frontend/src/brand/theme.css) traduzido para v3.
// `important: '.lnx-brand'` prende as classes ao container do login: não vazam para o CRM (tema
// do Rizar) e ganham das classes de lá dentro do login.
/** @type {import('tailwindcss').Config} */
module.exports = {
  important: '.lnx-brand',
  content: ['./src/brand/**/*.tsx', './src/features/auth/**/*.tsx', './src/pages/LoginPage.tsx'],
  corePlugins: { preflight: false },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      navy: {
        DEFAULT: 'var(--lnx-navy)',
        900: 'var(--lnx-navy-900)',
        850: 'var(--lnx-navy-850)',
        800: 'var(--lnx-navy-800)',
        750: 'var(--lnx-navy-750)',
        700: 'var(--lnx-navy-700)',
        600: 'var(--lnx-navy-600)',
        active: 'var(--lnx-nav-active)',
        drag: 'var(--lnx-navy-drag)',
      },
      violet: {
        DEFAULT: 'var(--lnx-violet)',
        600: 'var(--lnx-violet-600)',
        300: 'var(--lnx-violet-300)',
        tint: 'var(--lnx-violet-tint)',
        deep: 'var(--lnx-violet-deep)',
      },
      cyan: { DEFAULT: 'var(--lnx-cyan)', 600: 'var(--lnx-cyan-600)', tint: 'var(--lnx-cyan-tint)' },
      white: 'var(--lnx-white)',
      'on-accent': 'var(--lnx-on-accent)',
      slate: {
        DEFAULT: 'var(--lnx-slate)',
        300: 'var(--lnx-slate-300)',
        400: 'var(--lnx-slate-400)',
        tint: 'var(--lnx-slate-tint)',
      },
      stage: { 1: 'var(--lnx-stage-1)', 2: 'var(--lnx-stage-2)', 3: 'var(--lnx-stage-3)', 4: 'var(--lnx-stage-4)' },
      success: 'var(--lnx-success)',
      warning: 'var(--lnx-warning)',
      danger: 'var(--lnx-danger)',
    },
    fontFamily: {
      sans: 'var(--lnx-font-sans)',
      mono: 'var(--lnx-font-mono)',
    },
    borderRadius: {
      none: '0',
      xs: 'var(--lnx-radius-xs)',
      sm: 'var(--lnx-radius-sm)',
      md: 'var(--lnx-radius-md)',
      lg: 'var(--lnx-radius-lg)',
      xl: 'var(--lnx-radius-xl)',
      '2xl': 'var(--lnx-radius-2xl)',
      full: '9999px',
    },
    extend: {
      fontSize: {
        display: ['56px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '800' }],
        'app-title': ['26px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        h2: ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        lead: ['20px', { lineHeight: '1.55', fontWeight: '500' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '500' }],
        ui: ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        small: ['13px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      // v4 aceita qualquer múltiplo de 0,25rem (pl-10.5); no v3 ele precisa existir na escala
      spacing: { 10.5: '2.625rem' },
      backgroundImage: { flow: 'var(--lnx-gradient-flow)' },
      animation: {
        'bridge-pulse': 'bridge-pulse 1.1s ease-in-out infinite',
        'bridge-light': 'bridge-light 0.35s ease-out forwards',
        'mark-pop': 'mark-pop 0.45s ease-out 0.3s',
        'fade-in': 'fade-in 0.2s ease-out',
        shake: 'shake 0.4s ease-in-out',
      },
      keyframes: {
        'bridge-pulse': {
          '0%': { transform: 'translate(0, 0)', opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { transform: 'translate(32px, 32px)', opacity: '0' },
        },
        'bridge-light': { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
        'mark-pop': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [
    ({ addUtilities }) =>
      addUtilities({
        // Grade de nós (fundo do painel do login)
        '.bg-dot-grid': {
          backgroundImage: 'radial-gradient(circle, var(--lnx-grid-dot) 1.4px, transparent 1.6px)',
          backgroundSize: '32px 32px',
        },
      }),
  ],
}
