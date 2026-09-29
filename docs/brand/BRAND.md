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
6. **Cyan é conexão/interação**: nós, links, foco, valores fechados, badges de WhatsApp. Não usar cyan em blocos grandes.
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
| Cyan Accent | `#22D3EE` | Conexão e interação. Nós, links, foco, valores fechados. |
| White | `#F8FAFC` | Texto principal no escuro, fundo claro. |
| Slate | `#64748B` | Neutro de apoio (ícones inativos, divisores no claro). |

### 4.2 Apoio (interface)

| Nome | HEX | Uso |
|---|---|---|
| Navy 900 | `#0E1428` | Sidebar |
| Navy 850 | `#0F1426` | Fundo das colunas do Kanban |
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
| Etapas do funil | `#6D5DFB` → `#5C8AF6` → `#3DB3F1` → `#22D3EE` | Bolinha da coluna do Kanban, nós da trilha do funil |

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
| KPI compacto | Geist Mono 20 / 500 | 0 | Faixa de KPIs do Kanban (`text-kpi-sm`) |

**Regras:** títulos sempre com tracking negativo; valores monetários e tempos sempre em Geist Mono; máximo ~70 caracteres por linha em texto corrido.

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

### Faixa de KPIs (topo do Kanban)
Uma superfície só com 4 indicadores: `radius 16` · fundo `#11172A` · borda e divisórias 1 px `#232B45` · células `padding 14 20`.
Rótulo 13/600 `#94A3B8` · valor Geist Mono **20**/500 (KPI compacto); receita/fechado em `#22D3EE`.
Taxa de conversão com barra de 3 px: trilha `#1E2640`, preenchimento no gradiente violeta→cyan.
No celular: grade 2 × 2.

### Coluna do Kanban
`padding 10` · `radius 16` · fundo `#0F1426` · **sem borda em repouso**; ao receber um card arrastado, borda 1 px `#2A3352` · gap 8. As colunas não esticam: cada uma tem a altura do próprio conteúdo.
Cabeçalho (altura 32): bolinha 8 px na cor da etapa + nome 14/700 + contagem Geist Mono 12 `#94A3B8` + total da etapa em R$ (Geist Mono 12 `#CBD5E1`) à direita + botão "+" (novo lead na etapa).
Abaixo do cabeçalho, linha de 2 px na cor da etapa.
Cores das etapas (progressão do funil): `#6D5DFB` → `#5C8AF6` → `#3DB3F1` → `#22D3EE` (da 5ª etapa em diante, cyan).

### Card de lead
`padding 12` · `radius 12` · fundo `#141A2E` · borda `#232B45` (hover `#2A3352`) · gap 4 entre linhas.
- Linha 1: nome do negócio 14/700 + valor (Geist Mono 12) à direita; sem valor: "—" em `#94A3B8`.
- Linha 2: contato 13/500 `#94A3B8` + tempo desde a última movimentação (Manrope 12/600 `#94A3B8`) à direita.
- Linha 3: etiqueta de origem.
- Geist Mono no card só para dinheiro: o tempo fica em Manrope para não competir com o valor.
- **Sendo arrastado:** fundo `#161E38`, borda 1 px `#22D3EE`, sombra `0 12px 32px rgba(0,0,0,.45)`, rotação -1.5°, tempo "agora" em cyan.
- **Fechado:** valor em `#22D3EE`.

### Etiquetas de origem
| Origem | Fundo | Texto |
|---|---|---|
| Instagram | `#241F5C` | `#A99FFD` |
| WhatsApp | `#0E3440` | `#22D3EE` |
| Indicação / outros | `#1E2640` | `#CBD5E1` |

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
│ Sidebar  │ Funil de vendas (Vendas)         [🔍 Buscar] [+ Novo lead]│
│ 248px    ├──────────┬──────────┬──────────┬──────────────────────────┤
│ #0E1428  │ KPI      │ KPI      │ KPI ▬▬── │ KPI (receita em cyan)    │
│          │          │          │          │  ← faixa única, 1 bloco   │
│ Logo     ├──────────┴──────────┴──────────┴──────────────────────────┤
│ Funil ●  │ Novo lead │ Contato feito │ Proposta │ Fechado            │
│ Leads    │ [card]    │ [card]        │ [card*]  │ [card]             │
│ Conversas│ [card]    │ [card]        │ [card]   │ [card]             │
│ Agenda   │ [card]    │ [card]        │          │                    │
│ Relatór. │                                                           │
│ CANAIS   │  * card sendo arrastado: borda cyan + rotação -1.5°       │
│ Usuário  │                                                           │
└──────────┴───────────────────────────────────────────────────────────┘
```
Área principal: `padding 28 32`, gap 20. Faixa de KPIs e colunas: grid de 4 colunas; colunas com gap 16. Sidebar com borda direita 1 px `#1E2640`.

### 9.2 Site — hero (1440 × 900)
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
- [ ] Números e valores em Geist Mono
- [ ] Títulos Manrope com tracking negativo
- [ ] Cyan só em pontos de conexão/interação
- [ ] Gradiente só em linhas finas
- [ ] Linhas decorativas só em 0°/90°/45°
- [ ] Símbolo vindo dos assets, nunca redesenhado
- [ ] Foco visível (outline 2 px cyan)
