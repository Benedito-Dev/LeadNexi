# LeadNexi

CRM que conecta Instagram → Lead → Kanban → WhatsApp → Venda. Monorepo com `backend/` (NestJS + Prisma) e `frontend/` (React 19 + Vite + Tailwind v4). Estrutura, API e como rodar: `README.md`.

## Identidade visual (obrigatório em qualquer UI)

Antes de criar ou alterar tela, componente, estilo, ícone ou texto de interface, **leia `docs/brand/BRAND.md`** — é a fonte da verdade (seção 0 = regras, seção 8 = componentes, seção 11 = checklist de revisão). Os erros mais comuns:

- Tema escuro por padrão (fundo `navy`), com tema claro opcional (seção 4.6): use os tokens de papel, nunca cor fixa. Texto sobre violeta = `text-on-accent`.
- Botão primário `bg-violet-600` (nunca `bg-violet` com texto branco).
- Texto secundário `text-slate-400` / `text-slate-300` — nunca `text-slate` sobre navy.
- Cyan só em conexão/interação (foco, links, nós, WhatsApp); dinheiro fechado em verde (`text-success`). Gradiente `bg-flow` só em linhas ≤ 4px.
- Números e valores em Manrope (`tabular-nums` em colunas); Geist Mono (`font-mono`) só em rótulos técnicos.
- Símbolo e logo só via `<LeadNexiMark>` / `<LeadNexiLogo>` — nunca redesenhar.
- Sem emoji. Ícones Lucide com `strokeWidth={1.75}`.
- Textos em português do Brasil, sentence case ("Novo lead").

## Onde está cada coisa

- `frontend/src/brand/tokens.css` — variáveis `--lnx-*`. Fonte única de cores, fontes, raios e sombras.
- `frontend/src/brand/theme.css` — mapeia os tokens para o Tailwind. A paleta padrão do Tailwind está desligada: classes como `bg-blue-500` não existem.
- `frontend/src/brand/LeadNexiMark.tsx` — símbolo e logo em React.
- `frontend/public/brand/` — SVGs (símbolo, logo, favicon, ícones de app), servidos em `/brand/*.svg`.

Não use hex solto em componentes. Cor ou tamanho novo: pergunte antes, depois adicione em `tokens.css` + `BRAND.md` e mapeie em `theme.css`.

## Comandos

- Frontend (`frontend/`): `npm run lint`, `npm run build`, `npm run dev`.
- Backend (`backend/`): ver `README.md`.
