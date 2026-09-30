# LeadNexi — Guia de Marca e Interface

> Fonte da verdade da identidade visual do LeadNexi. Este documento foi escrito para ser
> lido por humanos **e** por agentes de código (Claude Code). Os valores aqui são exatos:
> não arredonde, não substitua por "parecidos", não invente cores novas.

Arquivos que acompanham este guia:

| Arquivo | Para quê |
|---|---|
| `frontend/src/brand/tokens.css` | Variáveis CSS `--lnx-*` (cores, fontes, raios, espaços, sombras). Fonte única dos valores. |
| `frontend/src/brand/theme.css` | Os mesmos tokens expostos ao Tailwind v4 (`bg-navy-800`, `text-h1`, `rounded-md`…). A paleta padrão do Tailwind fica desligada. |
| `frontend/src/brand/LeadNexiMark.tsx` | Componentes React `<LeadNexiMark>` e `<LeadNexiLogo>`. |
| `frontend/public/brand/*.svg` | Símbolo, logo, favicon e ícones de app prontos (servidos em `/brand/*.svg`). |

---

## 0. Regras para o agente (ler antes de gerar qualquer UI)

1. **Nunca redesenhe o símbolo.** Use `frontend/public/brand/*.svg` ou `LeadNexiMark.tsx`. A geometria está na seção 2.
2. **Só use cores da seção 4.** Se precisar de um tom que não existe, pergunte antes.
3. **Tema padrão é escuro** (fundo `#0B1020`). Versão clara só quando pedida.
4. **Botão primário = `#5B4BEA`** (Violet 600) com texto branco. Nunca `#6D5DFB` com texto branco em texto pequeno (contraste 4.56:1, no limite do AA).
5. **Texto secundário no escuro = `#94A3B8`** (Slate 400) ou `#CBD5E1` (Slate 300). Nunca `#64748B` sobre navy (contraste 3.98:1).
6. **Cyan é conexão/interação**: nós, links, foco, WhatsApp. Não usar cyan em blocos grandes. **Dinheiro fechado é verde** (`success`), não cyan.
7. **Gradiente violeta→cyan só em linhas finas** (≤ 4px) e barras de progresso. Nunca em fundos, botões ou cards.
8. **Ângulos de linha: 0°, 90° e 45°.** Nada de curvas orgânicas, ondas ou blobs.
9. **Sem emoji na interface. Ícones = traço 1.75, cantos arredondados** (estilo seção 7).
10. **Sombras só em elementos flutuantes** (modal, popover, card sendo arrastado). Cards parados usam borda, não sombra.
11. **Copy em português, sentence case**, verbos diretos ("Criar conta", "Novo lead"). Sem CAPS LOCK em títulos.

---

## 1. Essência da marca

- **O que é:** plataforma que conecta Instagram → Lead → CRM/Kanban → WhatsApp → Venda.
- **Nome:** Lead + Nexi (nexus, ligação).
- **Sensação:** "é aqui que minha operação comercial acontece."
- **Atributos:** tecnologia, conexão, organização, velocidade, eficiência, confiança.
- **Não é:** CRM corporativo antigo, visual gamer/cyberpunk, excesso de efeitos.
- **Conceito visual:** **pilares + ponte**. A estrutura (violeta) dá solidez; a conexão (cyan, a 45°, com nós nas pontas) mostra o fluxo.

---

## 2. Símbolo — "Nexo"

Dois pilares violeta ligados por uma ponte cyan a 45°. O pilar esquerdo tem um pé (forma o **L**); pilar esquerdo + ponte + pilar direito formam o **N**. Os círculos nas pontas da ponte são **nós** (leads/conexões).

### 2.1 Construção exata (grade 64 × 64)

| Elemento | Especificação |
|---|---|
| Pilar L | largura 12, de y=10 a y=54, pé até x=32 (altura 12), cantos r=6 |
| Pilar direito | `rect x=42 y=10 w=12 h=44 rx=6` |
| Ponte | linha de (16,16) a (48,48), traço 8, ponta arredondada |
| Nós | círculos r=7 em (16,16) e (48,48) |
| Respiro | ponte recortada dos pilares com folga de 3 (traço 14 e círculos r=10 de máscara) |

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <mask id="lnx-gap" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
      <rect width="64" height="64" fill="#fff"/>
      <path d="M16 16L48 48" stroke="#000" stroke-width="14" stroke-linecap="round"/>
      <circle cx="16" cy="16" r="10" fill="#000"/>
      <circle cx="48" cy="48" r="10" fill="#000"/>
    </mask>
  </defs>
  <g mask="url(#lnx-gap)" fill="#6D5DFB">
    <path d="M10 16A6 6 0 0 1 22 16V42H26A6 6 0 0 1 26 54H16A6 6 0 0 1 10 48Z"/>
    <rect x="42" y="10" width="12" height="44" rx="6"/>
  </g>
  <path d="M16 16L48 48" stroke="#22D3EE" stroke-width="8" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="7" fill="#22D3EE"/>
  <circle cx="48" cy="48" r="7" fill="#22D3EE"/>
</svg>
```

> Em React, IDs de máscara precisam ser únicos por instância — use `LeadNexiMark.tsx` (já resolve com `useId`).

### 2.2 Versão reduzida (≤ 32 px e favicon)

Abaixo de 32 px os respiros somem. Use sem máscara e com ponte mais grossa (traço 10, sem círculos):

```svg
<path d="M10 16A6 6 0 0 1 22 16V42H26A6 6 0 0 1 26 54H16A6 6 0 0 1 10 48Z" fill="#6D5DFB"/>
<rect x="42" y="10" width="12" height="44" rx="6" fill="#6D5DFB"/>
<path d="M16 16L48 48" stroke="#22D3EE" stroke-width="10" stroke-linecap="round"/>
```

### 2.3 Variações de cor

| Variação | Pilares | Ponte e nós | Usar em |
|---|---|---|---|
| Sobre escuro (padrão) | `#6D5DFB` | `#22D3EE` | App, site, redes |
| Sobre claro | `#6D5DFB` | `#0891B2` | Documentos, fundos brancos |
| Mono branco | `#F8FAFC` | `#F8FAFC` | Sobre violeta ou fotos. Exceção: no ícone violeta a ponte fica `#22D3EE` |
| Mono navy | `#0B1020` | `#0B1020` | Impressão 1 cor, carimbos |

### 2.4 Uso

- **Área de proteção:** mínimo de ½ da largura do símbolo em volta.
- **Tamanho mínimo:** 16 px (versão reduzida); 40 px para a versão com respiros.
- **Não fazer:** girar, espelhar, trocar a cor da ponte por violeta, adicionar sombra/brilho, contorno, gradiente no símbolo, mudar a proporção, colocar sobre fundo poluído sem placa.

---

## 3. Logo

### 3.1 Principal — horizontal (símbolo + nome)

- Símbolo à esquerda, nome à direita, centralizados verticalmente.
- **Nome:** "LeadNexi", Manrope **800**, tracking **-0.045em**, line-height 1.
- **Proporção:** tamanho da fonte = **0.72 ×** a altura do símbolo. Espaço entre eles = **0.3 ×** a altura do símbolo.
  - Ex.: símbolo 136 px → nome 98–104 px, espaço ~28–40 px. Símbolo 30 px → nome 21 px, espaço 10 px.
- Cor do nome: `#F8FAFC` no escuro, `#0B1020` no claro, branco sobre violeta.

### 3.2 Secundária — empilhada

Símbolo acima, nome abaixo, centralizados. Nome ≈ 0.43 × altura do símbolo; espaço 20 px (para símbolo de 150 px).

### 3.3 Só o nome

"Lead" em `#F8FAFC` + "Nexi" em `#A99FFD`. Usar só quando o símbolo já aparece por perto (ex.: rodapé).

### 3.4 Fundos permitidos

`#0B1020` (padrão), `#11172A`, `#F8FAFC`, `#5B4BEA` (versão branca).

> `logo-horizontal-*.svg` usa texto vivo em Manrope. Carregado via `<img>` ou CSS, o SVG **não** enxerga as
> fontes da página e cai na fonte de fallback. No app, use `<LeadNexiLogo>`. Para material impresso
> ou uso externo, converter o texto em contornos no Figma/Illustrator.

---

## 4. Cores

### 4.1 Principais

| Nome | HEX | Papel |
|---|---|---|
| Deep Navy | `#0B1020` | Base. Fundo principal do app e do site. |
| Electric Violet | `#6D5DFB` | Identidade. Símbolo, destaques, estados ativos de marca. |
| Cyan Accent | `#22D3EE` | Conexão e interação. Nós, links, foco, WhatsApp. |
| White | `#F8FAFC` | Texto principal no escuro, fundo claro. |
| Slate | `#64748B` | Neutro de apoio (ícones inativos, divisores no claro). |

### 4.2 Apoio (interface)

| Nome | HEX | Uso |
|---|---|---|
| Navy 900 | `#0E1428` | Sidebar |
| Navy 850 | `#0F1426` | Fundo da coluna do Kanban ao receber um card arrastado |
| Navy 750 | `#11172A` | Painéis, mock do produto |
| Navy 800 | `#141A2E` | Superfície: cards, inputs, KPIs |
| Navy 700 | `#232B45` | Bordas padrão |
| Navy 600 | `#2A3352` | Bordas fortes, pontos da grade |
| Nav active | `#1B2242` | Item de menu ativo |
| Violet 600 | `#5B4BEA` | **Botões primários** |
| Violet 300 | `#A99FFD` | Texto violeta sobre escuro |
| Violet tint | `#241F5C` | Fundo de etiqueta "Instagram" |
| Cyan 600 | `#0891B2` | Cyan sobre fundo claro |
| Cyan tint | `#0E3440` | Fundo de etiqueta "WhatsApp"/badges |
| Slate 300 | `#CBD5E1` | Texto secundário forte |
| Slate 400 | `#94A3B8` | Legendas, metadados |
| Slate tint | `#1E2640` | Fundo de etiqueta neutra ("Indicação"), borda da sidebar, trilha discreta do hero |
| Navy drag | `#161E38` | Fundo do card de lead sendo arrastado |
| Kanban border | `#1B2240` | Borda da coluna do Kanban |
| Violet deep | `#2A2468` | Avatar, balão de mensagem enviada |
| Grid dot | `#161D35` | Pontos da grade de nós sobre o fundo navy |
| Trail | `#3B4470` | Trilhas secundárias da linguagem gráfica |
| Etapas do funil | `#6D5DFB` → `#5C8AF6` → `#3DB3F1` → `#22D3EE` | Faixa do topo da coluna do Kanban, bolinha da etapa na tabela de leads, nós da trilha do funil |

### 4.3 Estados

Sucesso `#34D399` · Atenção `#FBBF24` · Erro `#F87171`.

### 4.4 Proporção de uso

60% navy · 22% claro/texto · 12% violeta · 6% cyan. O cyan é o tempero: quanto menos, mais ele chama atenção.

### 4.5 Contraste (checado)

| Combinação | Razão | Uso |
|---|---|---|
| `#F8FAFC` em `#0B1020` | 18.1:1 | Texto principal |
| `#94A3B8` em `#0B1020` | 7.4:1 | Texto secundário |
| `#94A3B8` em `#141A2E` | 6.7:1 | Metadados dentro de cards |
| Branco em `#5B4BEA` | 5.8:1 | Botões ✅ |
| Branco em `#6D5DFB` | 4.56:1 | No limite do AA — não usar em botão ❌ |
| `#64748B` em `#0B1020` | 3.98:1 | Não usar para texto ❌ |
| `#0891B2` em `#F8FAFC` | 3.52:1 | Tema claro: só texto ≥ 24 px ou ícones ❌ texto pequeno |
| `#6D5DFB` em `#F8FAFC` | 4.35:1 | Tema claro: só texto ≥ 24 px ❌ texto pequeno |

---

### 4.6 Tema claro
O escuro continua sendo o padrão. O usuário alterna pelo botão sol/lua na sidebar (ao lado de "Sair"); a escolha fica salva no navegador (`leadnexi.theme`).
Os tokens mantêm o nome do escuro e trocam só o valor: cada um guarda o **papel** (`navy-800` = superfície, `white` = texto principal). Por isso os componentes não mudam entre temas. Os valores ficam em `tokens.css`, no bloco `:root[data-theme="light"]`.

| Token (papel) | Escuro | Claro |
|---|---|---|
| `navy` (fundo) | `#0B1020` | `#F4F6FA` |
| `navy-900` (sidebar) | `#0E1428` | `#FFFFFF` |
| `navy-850` (coluna do Kanban) | `#0F1426` | `#EAEEF4` |
| `navy-800` (superfície: cards, inputs) | `#141A2E` | `#FFFFFF` |
| `navy-750` (painel, hover de menu) | `#11172A` | `#F1F4F9` |
| `navy-700` (borda) | `#232B45` | `#E2E7EF` |
| `navy-600` (borda forte) | `#2A3352` | `#CBD3DF` |
| `nav-active` | `#1B2242` | `#E8ECF4` |
| `slate-tint` | `#1E2640` | `#E8ECF3` |
| `white` (texto principal) | `#F8FAFC` | `#0B1020` |
| `slate-300` (texto secundário forte) | `#CBD5E1` | `#334155` |
| `slate-400` (texto secundário) | `#94A3B8` | `#536076` (5.9:1 no branco) |
| `violet-300` (texto violeta) | `#A99FFD` | `#5B4BEA` |
| `violet-tint` / `violet-deep` | `#241F5C` / `#2A2468` | `#ECEAFF` / `#E4E0FF` |
| `cyan` | `#22D3EE` | `#0E7490` (5.4:1: legível em texto pequeno) |
| `cyan-tint` | `#0E3440` | `#D5F3F8` |
| `success` / `warning` / `danger` | `#34D399` / `#FBBF24` / `#F87171` | `#047857` / `#B45309` / `#DC2626` |

Fixos nos dois temas: botão primário `#5B4BEA` com texto `on-accent` (`#F8FAFC`, nunca `text-white`, que vira navy no claro) e o fundo de modal `backdrop`.
Símbolo e logo seguem o tema sozinhos (variante `auto`, que é o padrão): ponte `#22D3EE` e nome `#F8FAFC` no escuro; ponte `#0891B2` e nome `#0B1020` no claro.

## 5. Tipografia

| Papel | Fonte | Pesos |
|---|---|---|
| Principal (logo, títulos, UI, texto) | **Manrope** | 400, 500, 600, 700, 800 |
| Secundária (números, valores, horários, rótulos técnicos, código) | **Geist Mono** | 400, 500 |

Google Fonts:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap">
```

### Escala

| Token | Tamanho / peso / altura | Tracking | Exemplo |
|---|---|---|---|
| Hero (site) | 68 / 800 / 1.02 | -0.045em | "Do primeiro direct à venda fechada." |
| Display | 56 / 800 / 1.0 | -0.04em | "Sua operação comercial" |
| H1 | 36 / 700 / 1.1 | -0.03em | "Funil de vendas" |
| H1 do app | 26 / 800 | -0.03em | Título de página no dashboard |
| H2 | 24 / 700 / 1.2 | -0.02em | "Lead movido para Proposta" |
| Lead (site) | 20 / 500 / 1.55 | 0 | Subtítulo do hero |
| Body | 16 / 500 / 1.6 | 0 | Texto corrido |
| UI | 14 / 600–700 | 0 | Menu, nome do lead no card |
| Small | 13 / 600 | 0 | Metadados, nome do contato |
| Data | Geist Mono 12–13 / 500 | 0 | "R$ 297", "12 min", contadores |
| KPI | Geist Mono 28 / 500 | 0 | "R$ 18.400" (card KPI isolado) |
| KPI compacto | Manrope 20 / 700 | -0.02em | Reservado (`text-kpi-sm`) |
| Valor de card KPI | Manrope 24 / 700 (`text-h2`) | -0.02em | Cards de KPI do Kanban |

**Regras:** títulos sempre com tracking negativo; máximo ~70 caracteres por linha em texto corrido.
**Números:** valores em R$, contagens e paginação ficam em **Manrope** no app todo (`tabular-nums` quando empilhados em coluna, como na tabela): a Geist Mono espaçava demais os valores em R$. Geist Mono fica para rótulos técnicos e código (ex.: a trilha do funil no site).

---

## 6. Linguagem gráfica — conexão + fluxo

### 6.1 Grade de nós
Pontos de r ≈ 1.5 px a cada **28–32 px**, cor `#161D35` (fundo do site) ou `#2A3352` (painéis). Sobre ela correm **trilhas**:

- segmentos só horizontais, verticais e **45°**;
- traço 2–4 px, cantos arredondados;
- trilha principal em `#6D5DFB`, trilhas secundárias em `#3B4470`;
- **nós**: início/fim em cyan sólido (r 6–9), intermediários em violeta sólido (r 5–6) ou anel (fundo navy + borda violeta 2.5–3).

Exemplo (grade 32, válido para banner/hero):
```svg
<path d="M80 432L208 304H400L528 176H760" fill="none" stroke="#6D5DFB" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="80" cy="432" r="9" fill="#22D3EE"/>
<circle cx="400" cy="304" r="6" fill="#6D5DFB"/>
<circle cx="528" cy="176" r="8" fill="#0B1020" stroke="#6D5DFB" stroke-width="3"/>
```
Os vértices caem sempre em pontos da grade (múltiplos do espaçamento + metade).

### 6.2 Trilha do funil
Linha horizontal de 2 px com o gradiente violeta→cyan e 5 nós de 14 px com rótulos em Geist Mono 12 px abaixo:
**Instagram → Lead → Kanban → WhatsApp → Venda**.
Nós: anel (borda 2 px) em `#6D5DFB`, `#6D5DFB`, `#5C8AF6`, `#3DB3F1`; o último ("Venda") é cyan sólido e o rótulo fica em branco.

### 6.3 Formas base
- **Nó:** círculo cyan.
- **Pilar:** retângulo violeta com raio = metade da largura.
- **Ponte:** linha 45° com nós nas pontas.
- **Etiqueta:** pílula, padding 4×10, 12 px/700.
- **Cartão:** raio 12, fundo `#141A2E`, borda 1 px `#232B45`.

---

## 7. Ícones

- Grade 24×24, **traço 1.75**, `stroke-linecap: round`, `stroke-linejoin: round`, sem preenchimento.
- Cor herdada (`currentColor`): `#CBD5E1` normal, `#22D3EE` ativo.
- Tamanhos: 18–20 px na UI, 28 px em destaques.
- Biblioteca compatível: **Lucide** (mesmo estilo). Se usar Lucide, fixe `strokeWidth={1.75}`.

Ícones próprios usados no layout:
```svg
<!-- funil / kanban --> <rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>
<!-- conexão -->       <circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M7.8 7.8l8.4 8.4"/>
```

---

## 8. Componentes

### Botão primário
`height 44` (52 no site) · `padding 0 18–24` · `radius 12` (14 no site) · fundo `#5B4BEA` · texto `#FFFFFF` 14–16/700 · ícone opcional 18 px à esquerda, gap 8.

### Botão secundário
Mesmas medidas · fundo transparente · borda 1 px `#2A3352` · texto `#F8FAFC`.

### Botão destrutivo
Mesmas medidas do secundário · texto `#F87171` (Erro). Ações que apagam dados pedem confirmação em dois passos ("Excluir" → "Confirmar exclusão").

### Input de busca
`height 44` · `padding 0 14` · `radius 12` · fundo `#141A2E` · borda `#232B45` · ícone lupa 18 px `#94A3B8` · placeholder `#94A3B8` · foco: outline 2 px `#22D3EE`.

### Item de menu (sidebar)
`height 44` · `padding 0 12` · `radius 10` · gap 12 · texto 14/600 `#CBD5E1`.
Ativo: fundo `#1B2242`, texto `#F8FAFC` 700, ícone `#22D3EE`.
Contador: pílula fundo `#0E3440`, texto `#22D3EE` Geist Mono 11.

### Card KPI
`padding 18 20` · `radius 16` · fundo `#141A2E` · borda `#232B45` · rótulo 13/600 `#94A3B8` · valor Geist Mono 28/500 (valor de receita em `#22D3EE`).

### Cards de KPI (topo do Kanban)
Quatro cards compactos (grade de 4 no desktop, 2 no tablet, 1 no celular, gap 16): fundo `navy-800` · borda `navy-700` · `radius 16` · `padding 14 16`.
À esquerda: rótulo 13/600 `slate-400`, valor Manrope 24/700 e legenda 12/600 `slate-400`. À direita, alinhado à base, um gráfico pequeno (≈ 36 px de altura):

| Card | Gráfico | Legenda |
|---|---|---|
| Leads no funil | barrinhas dos leads criados por dia (14 dias); hoje em violeta, demais `navy-600`, dia vazio = traço `slate-tint` | "N novos em 7 dias" |
| Em negociação | uma barrinha violeta por etapa aberta (dica com nome e valor) | "N leads abertos" |
| Taxa de conversão | anel 40 px, traço 4, trilha `slate-tint`, preenchimento violeta | "N de M em Fechado" |
| Fechado | sem gráfico; valor em verde (`success`) | "Ticket médio R$ …" |

Gráficos só com dado real (nada de série inventada). Barras com dica nativa (`title`) e rótulo acessível.

### Coluna do Kanban
`padding 10` (topo 12) · `radius 16` · fundo `navy-850` · **sem borda em repouso**; ao receber um card arrastado, borda 1 px `navy-600` · gap 10 entre cabeçalho e cards, 8 entre cards. **Todas as colunas têm a mesma altura**: descem até o fim da tela (mínimo 320 px), e a coluna inteira aceita soltar card. Gap 16 entre colunas.
No topo, faixa de 2 px na cor da etapa (recuada 16 px das bordas, pontas arredondadas embaixo). É a identidade da etapa na coluna; não há bolinha.
Cabeçalho numa linha (altura 32): nome 14/700 + contagem (só o número, 13 `slate-400`) à esquerda e total da etapa em R$ (13 `slate-400`) à direita. No desktop, os botões "+" (novo lead na etapa) e "⋯" (ações), 28 px, aparecem **no lugar do total** no hover/foco da coluna (ou com o menu aberto); em tela de toque ficam sempre visíveis, ao lado do total.
Largura mínima 248 px; as colunas dividem o espaço. No fim do quadro, botão "+" de 32 px (só ícone, `aria-label` "Nova etapa") alinhado ao cabeçalho; ao clicar vira um campo.
Coluna vazia: caixa tracejada "Arraste um card para cá." em 13/600 `slate-400`.
Ações da etapa (menu "⋯"): Renomear (o nome vira campo: Enter salva, Esc cancela), Mover para a esquerda/direita (a cor acompanha a nova posição) e Excluir etapa (desativado enquanto houver leads, com a explicação; confirma em modal).

### Menu suspenso
Flutuante: fundo `#141A2E` · borda `#2A3352` · `radius 12` · sombra float · padding 4 · largura 224.
Itens: ícone 18 + texto 14/600 `#CBD5E1` (hover/foco: fundo `#11172A`, texto `#F8FAFC`) · destrutivo em `#F87171` · desativado em `#94A3B8` com a explicação em 12/500 abaixo.
Teclado: setas navegam, Home/End vão às pontas, Esc fecha e devolve o foco ao botão.
Cores das etapas (progressão do funil): `#6D5DFB` → `#5C8AF6` → `#3DB3F1` → `#22D3EE` (da 5ª etapa em diante, cyan).

### Dropdown (seleção)
Substitui o `<select>` nativo em todo o app, inclusive em formulários (`<Dropdown>`, padrão listbox; com `name`, entra no FormData). Dentro de modal, o Esc fecha só a lista.
- **Gatilho:** igual ao input (`height 44` · `radius 12` · fundo `navy-800` · borda `navy-700`, hover/aberto `navy-600`), texto 14/600, ícone da opção à esquerda e chevron 16 `slate-400` à direita (gira ao abrir).
- **Lista:** flutuante como o menu suspenso (fundo `navy-800`, borda `navy-600`, `radius 12`, sombra float, padding 4), largura do gatilho (mínimo 200), altura máxima 288 com rolagem.
- **Opções:** ícone + texto 14/600 `slate-300`; ativa (mouse ou teclado) com fundo `slate-tint` e texto principal; selecionada com check 16 em cyan.
- **Ícones:** etapa = bolinha de 8 px na cor dela; origem = ícone do canal.
- **Teclado:** ↑ ↓ abrem e navegam, Home/End vão às pontas, Enter ou Espaço escolhe, Esc fecha e devolve o foco, uma letra pula para a opção.

### Card de lead
`radius 12` · fundo `navy-800` · borda `navy-700` (hover `navy-600`). Duas partes:
- **Corpo** (`padding 14 14 12`): foto do lead num círculo de 32 px (`LeadAvatar`: a foto de perfil do Instagram, quando o lead veio do direct, recortada em círculo; sem foto, ou se ela não carregar, as iniciais 12/800 `slate-300` sobre `slate-tint`) + nome 14/700 (até 2 linhas) + origem 12/600 `slate-400` com o ícone do canal (14 px, traço 1.75).
- **Rodapé** (divisória 1 px `navy-700`, `padding 10 14`): valor 14/700 à esquerda (sem valor: "Sem valor" 12/600 `slate-400`) e tempo desde a última movimentação à direita (ícone relógio 13 + 12/600 `slate-400`).
- Telefone e e-mail não aparecem no card: ficam no detalhe (a busca continua encontrando por eles).
- **WhatsApp:** com telefone válido, botão 32 px (ícone cyan, hover `cyan-tint`) no canto superior direito do corpo; abre `wa.me/<número>` em nova aba. No desktop aparece no hover/foco do card, em toque sempre. Fica fora da área arrastável (irmão sobreposto), então clicar ou dar Enter nele não abre a edição nem inicia o arraste; o nome reserva o espaço do botão.
- **Ícones de origem:** Instagram (violet-300) e WhatsApp (cyan), desenhados em `src/brand/icons.tsx` no traço do Lucide (adaptados do Tabler, MIT); Site = `Globe`, Indicação = `Users`, outras = `Tag`, em `slate-400`.
- **Próximo contato:** com follow-up agendado, o rodapé troca o tempo por um sino 13 + dia ("Hoje", "Amanhã", "qui., 02/10"), 12/700: `danger` e "Atrasado" se já passou, `warning` se é hoje, `slate-400` se é depois.
- **Sendo arrastado:** fundo `navy-drag`, borda 1 px cyan, sombra drag, rotação -1.5°, tempo "agora" em cyan.
- **Fechado:** valor em verde (`success`: `#34D399` no escuro, `#047857` no claro).

### Transição de login
Ao clicar em "Entrar", uma tela `navy` cobre o formulário com o símbolo (88 px, via `<LeadNexiMark>`, intacto) e os efeitos numa camada por cima, na grade de 64 da ponte (16,16 → 48,48):
- **Esperando (loop, sem fim definido):** um pulso branco com brilho na cor da ponte corre de um nó ao outro a cada 1,1 s. Texto "Entrando…". Fica no mínimo 0,4 s, para não piscar quando o login é instantâneo.
- **Deu certo (uma vez, ~0,75 s):** a ponte acende de ponta a ponta com brilho e o símbolo "respira" (escala 1 → 1,08 → 1). Texto "Tudo certo". Só então o app abre.
- **Erro:** a tela some, o formulário dá uma tremida horizontal (0,4 s) e mostra a mensagem; os campos mantêm o que foi digitado.
- **Reduzir movimento** (preferência do sistema): sem pulso, sem confirmação animada e sem tremida; entra direto.
Animações definidas em `theme.css` (`animate-bridge-pulse`, `animate-bridge-light`, `animate-mark-pop`, `animate-shake`, `animate-fade-in`), sempre com `motion-safe:`.

### Painel do lead
Clicar num lead (card ou linha da tabela) abre um **painel à direita** (`<Drawer>`: `<dialog>` com altura total, largura 480 px ou a tela inteira no celular, fundo `navy-800`, borda esquerda `navy-600`, sombra float). "Novo lead" continua no modal.
- **Topo:** iniciais + nome (`text-h2`) + etapa (bolinha) · valor · @ do Instagram; à direita, botões do direct (ícone do Instagram em `violet-300`, abre `ig.me/m/<@>`) e do WhatsApp (cyan), e fechar. Cada botão só aparece com o @ ou o telefone.
- **Abas** (14, ativa 700 com traço inferior de 2 px `violet`): **Histórico** (padrão) e **Dados** (o formulário do lead).
- **Próximo contato:** sem agendamento, campo "O que fazer?" + atalhos (Amanhã, Em 3 dias, Próxima segunda, às 9h) e "Outra data" (data e hora). Com agendamento, caixa `navy-750` com sino (cor pela situação), data "Amanhã às 09:00", o que fazer e as ações "Marcar como feito" (primário) e "Reagendar"; "×" desmarca.
- **Nova anotação:** textarea + "Anotar" (Ctrl/⌘ + Enter salva).
- **Linha do tempo:** mais novo primeiro; ícone num círculo 28 px `slate-tint` ligado por uma linha 1 px `navy-700`. Criado (violet-300), movido "de → para", anotação (em caixa `navy-750`, apagável com confirmação), mensagem do direct (ícone do Instagram em `violet-300`, texto na mesma caixa `navy-750` da anotação e "Direct do Instagram" antes da hora), contato agendado (cyan) e contato feito (`success`). Tempo relativo ("há 2 h") com a data completa na dica.
- **Dados:** o formulário tem o campo "Instagram" (`@usuario`; guardado sem o @).

### Tabela (lista de leads)
Superfície `radius 16` · fundo `navy-750` · borda `navy-700`. Mesmo vocabulário do card do Kanban.
Cabeçalho: altura 40 · texto 13/600 `slate-400` · divisória 1 px `navy-700`.
Linhas: altura 60 · divisória 1 px `navy-700` · hover `navy-800` · a linha inteira abre o registro (o nome é um botão, para o teclado).
- **Nome:** iniciais 32 px (`LeadAvatar`) + nome 14/700.
- **Contato:** telefone 13/500 `slate-300`; com telefone e e-mail, o e-mail vem embaixo em 12/600 `slate-400`.
- **Origem:** ícone do canal 16 px + nome 13 `slate-300` (mesmos ícones do card).
- **Etapa:** bolinha de 8 px na cor dela + nome.
- **Valor:** Manrope 14/700 com `tabular-nums`, alinhado à direita; etapa final em verde (`success`). Vazio "—" em `slate-400`.
- **WhatsApp:** última coluna, botão 32 px com o ícone em cyan (hover fundo `cyan-tint`), abre `wa.me/<número>` em nova aba. No desktop aparece no hover/foco da linha; em toque, sempre. Sem telefone válido, não aparece.
Filtros acima da tabela: selects de 44 px com texto 14/600 (`<Select compact>`), para não competir com os dados; "Limpar filtros" em texto `slate-400`.
No celular vira lista (mesma superfície): iniciais + nome + valor, contato + tempo, origem + etapa, e o botão de WhatsApp à direita (espaço reservado quando não há telefone, para alinhar os valores).
Paginação abaixo: "1–20 de 45" (Manrope com `tabular-nums`) e botões de 44 px no estilo secundário.

### Origem do lead
Mostrada como **ícone do canal + nome** (nunca pílula colorida): Instagram e WhatsApp com ícones próprios (`src/brand/icons.tsx`) em `violet-300` e `cyan`; Site (`Globe`), Indicação (`Users`) e outras (`Tag`) em `slate-400`. Componente: `SourceIcon`.

### Status de canal
Bolinha 8 px `#34D399` + nome 13 `#CBD5E1` + "conectado" 12 `#94A3B8`.

### Balão de mensagem (WhatsApp no app)
Enviado: fundo `#2A2468`, raio `12 12 4 12`, texto 13/1.45. Card flutuante: fundo `#141A2E`, borda `#2A3352`, raio 18, sombra float.

### Avatar de usuário
Círculo 36 px, fundo `#2A2468`, iniciais 13/800 `#A99FFD`.

---

## 9. Layouts de referência

### 9.1 Dashboard (1440 × 900)
```
┌──────────┬───────────────────────────────────────────────────────────┐
│ Sidebar  │ Funil de vendas                  [🔍 Buscar] [+ Novo lead]│
│ 248px    │                                                           │
│ #0E1428  │ [6    ▁▁█] [R$ 3.897 █▁▆] [50%  ◔] [R$ 2.650,50 verde]    │
│          │  ← 4 cards de KPI compactos, gráfico à direita            │
│ Logo     │                                                           │
│ Funil ●  │ ━━━━━━━━━ │ ━━━━━━━━━━━━━ │ ━━━━━━━━━ │ ━━━━━━━━━━━  +    │
│          │ Novo 1  $ │ Contato 1   $ │ Prop. 1 $ │ Fechado 3  $      │
│ Leads    │ [card]    │ [card]        │ [card*]  │ [card]             │
│ Conversas│ [card]    │ [card]        │ [card]   │ [card]             │
│ Agenda   │ [card]    │ [card]        │          │                    │
│ Relatór. │                                                           │
│ CANAIS   │  * card sendo arrastado: borda cyan + rotação -1.5°       │
│ Usuário  │                                                           │
└──────────┴───────────────────────────────────────────────────────────┘
```
Área principal: `padding 28 32`, gap 24. Cards de KPI em grade de 4; colunas com fundo `navy-850`, mesma altura até o fim da tela, gap 16. Sidebar com borda direita 1 px `#1E2640`.

### 9.2 Tela "Hoje" (agenda de contatos)
Página inicial do app (`/hoje`, primeiro item do menu, com contador `cyan-tint` de atrasados + hoje). Coluna única de até 768 px.
```
Hoje
Terça-feira, 29 de setembro · 2 contatos pendentes
Atrasados 1                                         ← danger
┌────────────────────────────────────────────────────────────┐
│ (TA) Teste Atrasado                  Ontem, 10:00  [◎] [✓ Feito] │
│      Mandar proposta · ● Contato                            │
└────────────────────────────────────────────────────────────┘
Hoje 1                                              ← warning
Amanhã 1 · Próximos dias 1                          ← slate-300
```
Linha: superfície `navy-800`, borda `navy-700` (hover `navy-600`), `radius 16`; iniciais + nome 14/700 + o que fazer · etapa; hora 13/700 (atrasado em `danger`); WhatsApp e "Feito" (secundário 36 px). Clicar no lead abre o painel. No celular a hora vai para baixo do nome e "Feito" vira só o ícone. Vazio: caixa tracejada explicando como agendar.

### 9.2.2 Página 404
Qualquer endereço desconhecido do app (rota `*`, abre com ou sem login). Tela cheia com a grade de nós (`bg-dot-grid`), logo no topo (link para o início) e, no centro:
- **Trilha interrompida** (seção 6.1): nó cyan de início → horizontal → 45° → horizontal em violeta, sinal de corte `//` e o resto do caminho tracejado (`trail`) até um nó vazio tracejado.
- Etiqueta "Erro 404" (violeta), título `text-h1` "Página não encontrada" e texto `slate-400`: "O link pode estar incompleto ou a página mudou de lugar. Seus leads continuam onde estavam."
- Botão primário "Ir para o início" e, só quando há página anterior no app, o secundário "Voltar".

### 9.2.3 Páginas públicas (privacidade e exclusão de dados)
`/privacidade` e `/exclusao-de-dados` abrem sem login (a Meta exige as duas para publicar o app). Fundo `navy`, logo no topo (link para o início) e uma coluna de leitura de até 672 px: título `text-h1`, "Atualizada em …" em `slate-400`, seções com `text-h2` e texto `slate-300`; links em `cyan` sublinhados. Contato pelo direct do @ da empresa.

### 9.5 Tela Instagram
Item "Instagram" no menu (ícone próprio). Coluna única de até 768 px, "Novo post" no topo (primário com conta conectada, secundário sem).
- **App da Meta** (ID e chave secreta do app usados no login do Instagram): sem configuração, é o primeiro cartão da tela, `navy-800` `radius 20`, título "Configure o app da Meta", onde copiar no painel da Meta e o formulário: "ID do app do Instagram" (só números, `tabular-nums`), "Chave secreta do app do Instagram" (campo de senha; a chave nunca volta do servidor, e com uma já salva o campo fica vazio com a dica "Deixe em branco para mantê-la") e "Endereço de retorno" (só leitura, com "Copiar" que vira check `success`). Erro em `danger` acima de "Cancelar" (só editando) e "Salvar" (primário). Configurado: linha compacta `radius 20`, padding 16, ícone de chave num círculo `slate-tint`, "App da Meta" + "ID … · chave secreta salva" em 13 `slate-400` e "Editar" (só o ícone no celular). Com conta conectada, essa linha fica no fim da tela.
- **Sem conta:** cartão `navy-800` `radius 20` com o ícone num círculo `violet-tint`, título "Conecte seu Instagram", três benefícios (ícones cyan) e "Conectar Instagram" (primário). Abaixo, a garantia "Você entra pelo login oficial do Instagram. O LeadNexi nunca vê sua senha." Sem o app da Meta salvo, o botão fica desativado e a garantia dá lugar a "Salve o app da Meta acima para liberar a conexão." Falha ao iniciar aparece em `danger`.
- **Conectada:** cartão com foto do perfil, @usuário, bolinha `success` "Conectado" e "Desconectar" (confirma com segundo clique; no celular, só o ícone até confirmar); abaixo, a lista de posts (vazio: caixa tracejada). Ao lado do título "Posts", o estado da publicação automática: bolinha `success` "Publicação automática ligada" ou `warning` "Publicação automática desligada" (desligada e com agendados, a lista avisa, com ícone `warning`, que eles só saem com "Publicar agora").
- **Lista de posts:** primeiro os que ainda não saíram, do mais próximo ao mais distante; depois os publicados, do mais recente (os últimos 20). Cada post num cartão `navy-800` `radius 16`, padding 12: capa 64 px (`radius 10`; carrossel com a contagem numa pílula `backdrop` + `on-accent` no canto), legenda 14 (até 2 linhas; vazia = "Sem legenda" em `slate-400`) e a linha de detalhes 13 `slate-400`: status (ícone 14 + texto 700: Agendado `slate-300`, Publicando com giro, Publicado `success`, Falhou `danger` com o motivo abaixo) · "Amanhã às 09:00" · "Carrossel · N imagens" ou "Foto" (publicado: a data em que saiu). No celular os "·" somem e os itens quebram linha. Ações à direita (só o ícone no celular; empilhadas no celular), cada uma confirma com segundo clique ("Confirmar"; em `danger` no cancelar): enquanto o post não saiu, "Publicar agora" (ícone de envio; "Tentar de novo" com ícone de recarregar quando falhou) e "Cancelar" (ícone X). Publicando, o status gira. Publicado: link "Ver no Instagram" em `cyan` (ícone de link externo). Depois de criar o post, faixa no topo: `success` "Post agendado para amanhã às 09:00." ou "Post publicado no Instagram."; `danger` "Post não publicado." + o motivo, ou o aviso de que o despertador não respondeu.
- **Lista ou grade:** ao lado do estado da publicação automática, um seletor com dois ícones (lista e grade) num fundo `navy-750` `radius 12`, padding 2; o escolhido fica em `navy-800` com ícone branco. A escolha fica lembrada no navegador. **Grade:** 3 colunas de capas 4:5 (`radius 10`; espaço de 8 px, ou 4 px no celular), como o perfil do Instagram, na mesma ordem da lista. Sobre a capa, selos `backdrop` + `on-accent`: status embaixo (agendado mostra quando sai, "Amanhã às 09:00"; os outros, o status; no celular, só o ícone) e a contagem do carrossel em cima. Falhou ganha contorno `danger` de 2 px afastado 2 px da capa. Clicar abre os **detalhes** (`<Drawer>`): título pelo status ("Post agendado", "Publicando post", "Post publicado", "Post não publicado"), a imagem na proporção dela (carrossel com setas e "2/3" em `backdrop`), a linha de status, o motivo da falha, a legenda completa (com as quebras de linha) e, no rodapé, "Cancelar post" (secundário; "Confirmar cancelamento" em `danger`) e "Publicar agora" ou "Tentar de novo" (primário; "Confirmar"), ou "Ver no Instagram" (texto `cyan`) no publicado.
- **Direct vira lead:** conta conectada sem a permissão de mensagens mostra, no cartão da conta e abaixo de uma divisória, o convite (ícone de mensagem em `cyan`) "Para cada direct virar lead, conecte de novo…" e "Conectar de novo" (secundário). No formulário do cartão "App da Meta", abaixo do endereço de retorno e de uma divisória, a seção "Direct do Instagram" com "URL de callback" e "Token de verificação" (só leitura, com "Copiar"), para "Configurar webhooks" no app da Meta.
- **Conexão expirada** (token recusado pela Meta ou vencido): bolinha `warning` "Conexão expirada"; no mesmo cartão, abaixo de uma divisória, o aviso (ícone `warning`) e "Conectar de novo" (primário). "Novo post" passa a secundário.
- **Volta do login** (`?conectado=1` / `?erro=negado|conta|expirado|falha`): faixa de aviso fechável no topo.
- **Novo post** (painel à direita, `<Drawer>`): área tracejada para arrastar ou escolher imagens (até 10); miniaturas numeradas em grade de 4, com remover e mover (no hover/foco; em toque sempre), aviso `warning` quando a proporção sai de 4:5–1,91:1, e "A imagem 1 é a capa do carrossel". Legenda com contadores de hashtags (30) e caracteres (2.200). "Quando publicar": seletor Agendar / Publicar agora + data e hora. No rodapé, o primeiro motivo que impede agendar, em texto claro; sem impedimento, "Será publicado amanhã às 09:00." (ou, em Publicar agora, "Vai para o seu perfil assim que você clicar em “Publicar agora”."); enviando, "Enviando imagem 2 de 3…" e depois "Publicando no Instagram…" com o botão girando; erro em `danger`.
- As imagens viram JPEG (lado maior 1440 px, fundo branco sob transparência) no navegador antes de subir. Controles sobre as miniaturas usam `backdrop` + `on-accent` (legíveis nos dois temas).

### 9.2.1 Site — hero (1440 × 900)
```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo]          Produto  Integrações  Preços        Entrar [Criar conta]│  88px
│                                                                      │
│ (chip) CRM · WHATSAPP · INSTAGRAM      ┌──────────────────────────┐  │
│ Do primeiro direct                     │  mock do funil (3 cols)  │  │
│ à venda fechada.            68/800     │  próximos posts · R$ mês │  │
│ Subtítulo 20px #CBD5E1                 └──────────────────────────┘  │
│ [Criar conta] [Ver como funciona]  ┌─────────────┐                   │
│ ○───○───○───○───●  trilha do funil │ balão WhatsApp (flutuante)      │
└──────────────────────────────────────────────────────────────────────┘
```
Fundo: navy + grade de nós 32 px (`#161D35`) + uma trilha 45° discreta em `#1E2640` no canto inferior direito. Padding lateral 80. Grid 1.05fr / 1fr, gap 64.

### 9.3 Aplicações de marca
- **Avatar:** círculo navy, símbolo com ~61% do diâmetro. Alternativa: círculo `#5B4BEA` com símbolo mono branco e ponte cyan.
- **Post 1:1:** navy + grade de nós 36 px + trilha violeta no rodapé; logo pequeno no topo; título 76/800 com segunda linha em `#A99FFD`.
- **Banner (1500 × 500):** logo 84 px + nome 72 px à esquerda (padding 110), frase 28/600 `#CBD5E1`; rede de nós ocupando a metade direita.
- **GitHub social preview (1280 × 640):** `org / leadnexi` em Geist Mono 20, logo 104 + nome 88, descrição 28, tags em pílulas Geist Mono 15.
- **Favicon:** `frontend/public/brand/favicon.svg` (placa navy raio 14 + versão reduzida).

---

## 10. Voz e textos

- Português do Brasil, direto, sem jargão de TI.
- Sentence case em tudo ("Novo lead", não "Novo Lead").
- Botões dizem a ação: "Criar conta", "Novo lead", "Enviar proposta".
- Taglines aprovadas:
  - "Do primeiro direct à venda fechada."
  - "Seu funil inteiro. Uma tela só."
  - "Instagram, CRM e WhatsApp — conectados."
- Estados vazios dão a próxima ação ("Nenhum lead aqui ainda. Arraste um card ou crie um novo lead.").

---

## 11. Checklist rápido de revisão

- [ ] Fundo `#0B1020` e superfícies nos tons navy da tabela
- [ ] Botão primário `#5B4BEA`, não `#6D5DFB`
- [ ] Nenhum texto em `#64748B` sobre fundo escuro
- [ ] Números em Manrope (`tabular-nums` em colunas); Geist Mono só em rótulos técnicos
- [ ] Dinheiro fechado em verde (`success`), cyan só em conexão/interação
- [ ] Títulos Manrope com tracking negativo
- [ ] Cyan só em pontos de conexão/interação
- [ ] Gradiente só em linhas finas
- [ ] Linhas decorativas só em 0°/90°/45°
- [ ] Símbolo vindo dos assets, nunca redesenhado
- [ ] Foco visível (outline 2 px cyan)
