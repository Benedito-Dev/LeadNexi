const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Copiado do Rizar (frontend/tailwind.config.js): o visual do CRM é idêntico por enquanto.
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  corePlugins: {
    preflight: false,               // DESABILITAR: 110+ views migradas com esta config. Ver ADR-DS-002.
  },
  theme: {
    extend: {
      colors: {
        // === shadcn/ui semantic colors (via CSS variables) ===
        // Sintaxe `<alpha-value>` habilita opacity modifiers (bg-primary/60 etc).
        // Tailwind substitui <alpha-value> por 1 (default) ou pelo valor passado.
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        chart: {
          1: "hsl(var(--chart-1) / <alpha-value>)",
          2: "hsl(var(--chart-2) / <alpha-value>)",
          3: "hsl(var(--chart-3) / <alpha-value>)",
          4: "hsl(var(--chart-4) / <alpha-value>)",
          5: "hsl(var(--chart-5) / <alpha-value>)",
        },

        // === TOKENS SEMANTICOS Rizar (sistema de tema light/dark) ===
        // Origem do post no Resultado do Social (feito pelo Rizar x postado direto)
        "origem-rizar":  "hsl(var(--origem-rizar) / <alpha-value>)",
        "origem-direto": "hsl(var(--origem-direto) / <alpha-value>)",
        "surface-base":    "hsl(var(--surface-base) / <alpha-value>)",
        "surface-raised":  "hsl(var(--surface-raised) / <alpha-value>)",
        "surface-sunken":  "hsl(var(--surface-sunken) / <alpha-value>)",
        "surface-overlay": "hsl(var(--surface-overlay) / <alpha-value>)",
        "surface-strong":  "hsl(var(--surface-strong) / <alpha-value>)",
        "on-strong":       "hsl(var(--text-on-strong) / <alpha-value>)",

        "content-primary":   "hsl(var(--text-primary) / <alpha-value>)",
        "content-secondary": "hsl(var(--text-secondary) / <alpha-value>)",
        "content-tertiary":  "hsl(var(--text-tertiary) / <alpha-value>)",
        "content-inverse":   "hsl(var(--text-inverse) / <alpha-value>)",

        "border-subtle": "hsl(var(--border-subtle) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",

        // Brand accent (Sunrise Coral preservado) — identidade visual Rizar
        "brand-accent": {
          DEFAULT:    "hsl(var(--brand-accent) / <alpha-value>)",
          hover:      "hsl(var(--brand-accent-hover) / <alpha-value>)",
          active:     "hsl(var(--brand-accent-active) / <alpha-value>)",
          foreground: "hsl(var(--brand-accent-foreground) / <alpha-value>)",
        },

        // Bolhas de chat (Bussola IA + WhatsApp)
        "bubble-user": {
          DEFAULT:    "hsl(var(--bubble-user-bg) / <alpha-value>)",
          foreground: "hsl(var(--bubble-user-fg) / <alpha-value>)",
        },
        "bubble-assistant": {
          DEFAULT:    "hsl(var(--bubble-assistant-bg) / <alpha-value>)",
          foreground: "hsl(var(--bubble-assistant-fg) / <alpha-value>)",
        },

        // Familia de canal WhatsApp (utils/bolhasUi.js) — so onde
        // `canalUi().familiaBolhas === 'wa'`. Bussola/Instagram ficam nos bubble-*.
        "chat-wa-out": {
          DEFAULT:    "hsl(var(--chat-wa-out-bg) / <alpha-value>)",
          foreground: "hsl(var(--chat-wa-out-fg) / <alpha-value>)",
        },
        "chat-wa-in": {
          DEFAULT:    "hsl(var(--chat-wa-in-bg) / <alpha-value>)",
          foreground: "hsl(var(--chat-wa-in-fg) / <alpha-value>)",
        },
        "chat-wa-tick-read": "hsl(var(--chat-wa-tick-read) / <alpha-value>)",
        "chat-wa-accent": {
          DEFAULT:    "hsl(var(--chat-wa-accent) / <alpha-value>)",
          foreground: "hsl(var(--chat-wa-accent-fg) / <alpha-value>)",
        },

        // Feedback semantico (success, warn, error, info)
        success: {
          DEFAULT:    "hsl(var(--success-bg) / <alpha-value>)",
          foreground: "hsl(var(--success-fg) / <alpha-value>)",
          border:     "hsl(var(--success-border) / <alpha-value>)",
        },
        warn: {
          DEFAULT:    "hsl(var(--warn-bg) / <alpha-value>)",
          foreground: "hsl(var(--warn-fg) / <alpha-value>)",
          border:     "hsl(var(--warn-border) / <alpha-value>)",
        },
        error: {
          DEFAULT:    "hsl(var(--error-bg) / <alpha-value>)",
          foreground: "hsl(var(--error-fg) / <alpha-value>)",
          border:     "hsl(var(--error-border) / <alpha-value>)",
        },
        info: {
          DEFAULT:    "hsl(var(--info-bg) / <alpha-value>)",
          foreground: "hsl(var(--info-fg) / <alpha-value>)",
          border:     "hsl(var(--info-border) / <alpha-value>)",
        },

        // === Paleta Rizar (tons unicos do brandbook — sem escalas geradas) ===
        // FONTE: frontend/docs/Identidade Visual RIZAR/Rizar_Brand_Book.pdf v1.0 Maio 2026, secoes 6 e 7
        // FONTE: docs/adrs/adr-FE-022-rizar-rebranding-foundation.md
        //
        // Brandbook regra 10 (secao 6): "Nao criar gradientes entre as cores da paleta. A marca e flat."
        // Por isso usamos APENAS 11 tons unicos do brandbook + opacity Tailwind (`/10`, `/40`, `/80`)
        // para variar em hover/disabled, ao inves de escalas geradas 50-900.
        "rizar-deep-sea":      "#0A1F3D",   // primaria — profundidade, autoridade, logo
        "rizar-sail-cream":    "#F4F1EA",   // base — vela, respiro, background geral
        "rizar-sunrise-coral": "#FF6B47",   // acento — CTA, foco, destino (uso pontual)
        "rizar-mid-sea":       "#1A3A5F",   // hover states, bordas escuras
        "rizar-sand":          "#E8E2D2",   // cards LP, divisoes, superficies secundarias
        "rizar-stone":         "#5F5E5A",   // texto secundario, captions
        "rizar-ink":           "#2C2C2A",   // texto max contraste

        // === Cores semanticas (uso restrito a interface — proibidas em comunicacao institucional) ===
        // Brandbook secao 6: paleta semantica deliberadamente atenuada para coexistir com Deep Sea.
        "rizar-success":       "#2D7A5F",
        "rizar-warning":       "#D4A845",
        "rizar-error":         "#C04A3D",
        "rizar-info":          "#3D6FA0",
      },
      borderRadius: {
        // --radius = 0.5rem (8px, brandbook secao 8). xl/lg/md/sm derivam via calc().
        xl: "calc(var(--radius) + 4px)",   // 12px — cards
        lg: "var(--radius)",                // 8px — inputs, botoes (padrao shadcn/ui)
        md: "calc(var(--radius) - 2px)",    // 6px — badges
        sm: "calc(var(--radius) - 4px)",    // 4px — micro elements
      },
      // "Empurrãozinho" do carrossel da gaveta do post (DEV-156): ao abrir, os
      // slides deslizam ~28px e voltam UMA vez, mostrando que dá pra arrastar.
      // Usado só com `motion-safe:` — some com prefers-reduced-motion.
      keyframes: {
        cutucar: {
          "0%, 100%": { transform: "translateX(0)" },
          "40%": { transform: "translateX(-28px)" },
        },
      },
      animation: {
        cutucar: "cutucar 1.1s ease-in-out 0.5s 1",
      },
      fontFamily: {
        // General Sans self-hosted (public/fonts/) — brandbook secao 7.
        // Fallback: Satoshi (irmas Fontshare) -> Inter (open) -> system stacks.
        // Bold/Light/Black NAO carregados — brandbook proibe (apenas 400/500/600).
        sans: [
          '"General Sans"',
          'Satoshi',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        // `display` removido: Neue Machina nunca foi carregada (memoria 2026-03-05). General Sans serve display tambem.
        mono: ['"IBM Plex Mono"', ...fontFamily.mono],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
