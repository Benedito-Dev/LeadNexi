# LeadNexi — Mapa das telas

Plano de todas as telas do LeadNexi, para cada tela nova nascer no lugar certo e sem duplicar outra.
Toda tela nova parte daqui; se o plano mudar, este arquivo muda antes do código.

Decisões que guiam o mapa (25/10/2026):

- **Uso de uma pessoa só** (o Benedito). Sem contas separadas, planos ou permissões.
- **WhatsApp por API não oficial**, entrando na caixa de Conversas no futuro. Hoje continua pelo link `wa.me`.
- **MCP para o Claude consultar e agir** (ler leads e resultados, criar lead, registrar contato, agendar post).

## 1. Princípios

1. **Menu por tarefa, não por canal.** Instagram e WhatsApp não são abas: são conexões que alimentam as telas.
   Mensagens de todos os canais caem em Conversas; posts, em Conteúdo; conectar canais, em Configurações.
   Canal novo = mais uma conexão e mais um filtro, nunca uma aba nova.
2. **No máximo 7 itens no menu.** O que passar disso vira sub-aba de um item que já existe.
3. **IA não é aba.** Aparece dentro das ações (gerar mensagem, sugerir resposta, resumir). Em Configurações fica
   só o modelo e a conexão com o Claude.
4. **Uma peça, um lugar.** Componentes que aparecem em mais de uma tela são feitos uma vez só (seção 4).
5. **Tudo que acontece fica no histórico do lead**, venha da tela, do WhatsApp, do Instagram ou do Claude.

## 2. O menu

```
Hoje            rotina do dia                                   pronto
Conversas       caixa única de mensagens (Instagram + WhatsApp)
CRM
 ├ Leads        quadro e tabela                                 pronto
 ├ Listas       nichos e listas de prospecção, importar, gerar
 └ Pipelines    funis e etapas                                  pronto
Clientes        pós-venda
Conteúdo        posts do Instagram
Resultados      placar e metas
Configurações
 ├ Perfil
 ├ Canais       Instagram, WhatsApp
 ├ Prospecção   metas, cadência, modelos de mensagem
 └ IA e Claude  modelo de IA e MCP
```

Rotas: `/hoje`, `/conversas`, `/crm`, `/crm/listas`, `/crm/pipelines`, `/clientes`, `/conteudo`, `/resultados`,
`/configuracoes/perfil`, `/configuracoes/canais`, `/configuracoes/prospeccao`, `/configuracoes/ia`.

## 3. As telas

Legenda do servidor: **tem** = a rota já existe · **falta** = precisa ser feito.

### 3.1 Hoje — pronto

A rotina do dia: missão (meta diária), próximas ações numeradas com botão WhatsApp ou Meet e a etapa do lead,
"Começar próxima ação" (um lead por vez).

Ainda entra aqui (pequeno, sem tela nova):
- lembretes de Clientes (renovação em 3 dias, relatório da semana pendente) — servidor **tem** `GET /clients/reminders`;
- conversas novas sem resposta, vindas de Conversas (quando ela existir);
- "Gerar mensagem" com IA no lead em foco (etapa 5).

### 3.2 Conversas

**Para que serve:** responder todo mundo num lugar só, sem abrir o Instagram ou o WhatsApp.

**Layout (desktop):** três colunas.
1. Lista de conversas: foto, nome, ícone do canal, última mensagem, há quanto tempo, bolinha de não lida.
   No topo: busca e filtro por canal (Todos · Instagram · WhatsApp) e por situação (Não lidas · Leads · Não leads).
2. A conversa aberta: mensagens, campo de resposta, "Sugerir resposta" (IA), aviso da janela de 24 h do Instagram.
3. Resumo do lead: etapa, próximo contato, "Abrir ficha", "Virar lead" (para quem ainda não é).

**Celular:** lista → conversa → resumo, uma tela por vez.

**Servidor:**
- Instagram: **tem** `GET /instagram/inbox`, `GET /leads/:id/instagram/conversation`, `POST /leads/:id/instagram/messages`.
- Caixa única: **falta** `GET /conversations` (todas, com canal) e `GET /conversations/:leadId` (as mensagens
  dos dois canais em ordem). As mensagens já ficam em `LeadActivity` com `channel`; é juntar, não criar tabela.
- WhatsApp: **falta** (etapa 7).

**Arquitetura dos canais:** cada canal é um *adaptador* no servidor com o mesmo contrato:
receber mensagem (webhook) → gravar no histórico do lead; enviar mensagem → registrar no histórico.

```
Instagram (API oficial da Meta) ─┐
                                 ├─► adaptador do canal ─► histórico do lead ─► Conversas
WhatsApp (API não oficial)  ─────┘
```

A tela de Conversas só conhece o contrato. Trocar o WhatsApp não oficial pelo oficial mexe só no adaptador.

**Risco do WhatsApp não oficial:** o WhatsApp pode banir o número. O LeadNexi nunca envia em massa nem sozinho;
todo envio sai de um clique, um por vez (mesma regra de hoje).

### 3.3 CRM

- **Leads** — pronto (quadro, ficha, importar planilha).
- **Pipelines** — pronto.
- **Listas** (nova): nichos e listas de prospecção, quantos leads em cada, quantos contatados e responderam
  (a regra "30 contatados, menos de 2 respostas = trocar nicho ou mensagem"). "Importar planilha" sai do quadro
  e mora aqui também. Futuro: gerador de lista pelo Google Maps.
  Servidor: **tem** `GET/POST/PATCH /lead-lists`; gerador **falta**.

### 3.4 Clientes

**Para que serve:** cuidar de quem fechou.

- Lista de clientes ativos primeiro: mensalidade, dia de cobrança, situação do pagamento, último relatório.
- Ficha do cliente: plano, verba diária, checklist de entrada (acesso de parceiro, WhatsApp Business),
  relatórios semanais (gasto, conversas, custo por conversa) e pagamentos (Pix recebido).
- "Gerar resumo para o cliente" (IA) a partir do relatório da semana.

Servidor: **tem** tudo em `/clients` (lista, ficha, relatórios, pagamentos, lembretes).

### 3.5 Conteúdo

**Para que serve:** publicar no Instagram sem sair do LeadNexi.

- **Posts:** calendário (arrastar para remarcar), lista e grade; "Novo post" (foto ou carrossel, legenda,
  hashtags salvas, agendar ou publicar agora).

Fora do plano (decisão de 26/10/2026): banco de provas. O servidor ainda tem `/proofs`, sem tela.

Servidor: **tem** `/instagram/posts`, `/instagram/media`, `/instagram/hashtag-sets`.
O front antigo (branch `backup/main-2026-10-23`) tem o calendário e o editor de post para reaproveitar.

### 3.6 Resultados

Placar da semana e do mês (contatos, respostas, reuniões, fechados, faturamento), taxa de resposta por
mensagem e por lista, sequência de dias batendo a meta. A meta em si é editada em Configurações › Prospecção.

Servidor: **tem** `GET /results`.

### 3.7 Configurações

Uma tela com sub-abas à esquerda (no celular, uma lista que abre cada uma).

- **Perfil:** nome, e-mail, trocar senha, tema. Servidor: **tem** `GET /auth/me`; editar e trocar senha **faltam**.
- **Canais:** um cartão por canal, no mesmo formato (situação, conectar, desconectar, o que falta configurar).
  - Instagram: app da Meta, conectar a conta, conta conectada. Tela **feita** (ainda não commitada como
    `/instagram`; muda para cá). Servidor: **tem**.
  - WhatsApp: ler o QR code do aparelho, situação da sessão, desconectar. Servidor: **falta** (etapa 7).
- **Prospecção:** meta diária e semanal, meta de faturamento, dias da cadência, modelos de mensagem
  (1ª mensagem, Retomada e Última, com os marcadores `{saudacao}`, `{loja}` e `{data}`; vazio = texto padrão).
  Servidor: **tem** `GET/PATCH /results/settings` (metas e modelos); dias da cadência **faltam**.
- **IA e Claude:**
  - IA: se está configurada e qual modelo. Servidor: **tem** `GET /ai/status`.
  - MCP: endereço do servidor MCP, gerar e revogar o token do Claude, últimas ações feitas pelo Claude.
    Servidor: **falta** (etapa 6).

## 4. Peças compartilhadas (fazer uma vez só)

| Peça | Onde aparece | Situação |
|---|---|---|
| Ficha do lead (`LeadModal`) | CRM, Hoje, Conversas, Clientes | pronta |
| Conversa (mensagens + resposta) | Conversas, aba "Conversa" da ficha | falta |
| Botões de canal (WhatsApp, Meet, Instagram) | Hoje, ficha, Conversas | WhatsApp e Meet prontos |
| Etiqueta da etapa | Hoje, Conversas, Clientes | pronta (`EtiquetaDaEtapa`) |
| Cartão de conexão | Configurações › Canais, IA e Claude | parcial (Instagram) |
| Cabeçalho de tela (`ListPageHeader`) | todas | pronto |
| Botão de IA ("Gerar", "Sugerir", "Resumir") | Hoje, ficha, Conversas, Clientes | falta |
| Sub-abas de tela | Configurações, Conteúdo | falta |

## 5. MCP (o Claude consultando e agindo)

Servidor MCP dentro do backend, protegido por um token pessoal gerado em Configurações › IA e Claude.

**Consultar:** o dia (`/leads/today`), buscar leads, ver um lead com histórico, resultados, clientes,
posts agendados, conversas.

**Agir:** criar e editar lead, mover de etapa, registrar contato e resposta, agendar próximo contato,
anotar, rascunhar e agendar post, lançar relatório de cliente.

**Regras:**
- toda ação do Claude entra no histórico do lead marcada "via Claude";
- o Claude não envia mensagem no WhatsApp nem no Instagram; ele prepara, a pessoa envia
  (mesma regra anti-banimento da seção 3.2);
- revogar o token corta o acesso na hora.

As ferramentas do MCP chamam os mesmos serviços das telas: nenhuma regra de negócio duplicada.

## 6. Ordem de construção

Cada etapa entrega valor sozinha e não refaz a anterior.

| Etapa | O que | Pronto quando |
|---|---|---|
| 1 | **Configurações** (casca com sub-abas) + Canais › Instagram + Prospecção (metas) | conecta o Instagram em produção pela tela nova |
| 2 | **Conversas** com o Instagram (servidor da caixa única + peça Conversa) | responde um direct de dentro do LeadNexi |
| 3 | **Conteúdo** (posts do Instagram) | agenda e publica um post pela tela nova |
| 4 | **Clientes** e **Resultados** | lança um relatório e vê o placar da semana |
| 5 | **IA dentro das ações** + modelos de mensagem em Prospecção | gera a mensagem do lead em foco na tela Hoje |
| 6 | **MCP** + Configurações › IA e Claude | o Claude cria um lead e registra um contato |
| 7 | **WhatsApp não oficial** (adaptador + Canais › WhatsApp + filtro em Conversas) | uma resposta do WhatsApp aparece em Conversas |
| 8 | **Listas** e gerador de lista | monta uma lista nova pelo Google Maps |

A ordem pode trocar entre etapas independentes (3, 4 e 8 não dependem umas das outras).
As etapas 1 e 2 vêm primeiro porque tudo que é canal depende delas.
