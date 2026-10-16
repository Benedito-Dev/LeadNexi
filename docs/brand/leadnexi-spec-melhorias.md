# LeadNexi — Especificação de melhorias (para execução com Codex)

> Autor: Benedito (dono do produto) · Escrito com apoio do Claude · Versão 1 · 15/10/2026
> App: https://leadnexi.vercel.app
> Objetivo deste documento: descrever **o que** construir e **por quê**, com detalhes de comportamento, telas, regras e critérios de aceite. Decisões de implementação (stack, libs, nomes de arquivos) ficam a cargo de quem implementar, respeitando o que já existe no projeto.

---

## 0. Contexto

### 0.1 Quem usa
Um único usuário: Benedito. Ele vende **gestão de anúncios no Meta (Instagram/Facebook) para negócios locais de Fortaleza** sob a marca **Alvo Digital**. Hoje prospecta lojas e assistências de celular encontradas no Google Maps e aborda pelo **WhatsApp** (canal principal) e pelo **Direct do Instagram** (canal secundário).

### 0.2 Meta de negócio
- Renda extra de R$ 200–300/mês, com 1–2 h por dia.
- Oferta de entrada: **R$ 500 no 1º mês, sem fidelidade**, + análise grátis dos anúncios.
- Ritmo de prospecção: **5 a 6 mensagens por dia**, uma por vez, personalizadas.
- Sequência: 1ª mensagem (dia 0) → follow-up 1 (dia 2) → follow-up final (dia 5).
- Regra de decisão: a cada 30 lojas contatadas, se menos de 2 responderem, troca-se o **nicho ou a mensagem**.

### 0.3 O problema
O LeadNexi já tem uma boa base (funil kanban, tabela de leads, importação de planilha, histórico por lead, Direct do Instagram dentro do lead, agendamento de posts), mas **não entrou na rotina**. Motivos observados:

1. **Está vazio de vida.** A tela "Hoje" mostra "nada pendente". Os 12 leads são pet shops de um nicho antigo, parados há 15 dias. Os leads reais (27 lojas de celular) vivem fora do app.
2. **A ação acontece no WhatsApp e o app não conversa com ele.** Para registrar um contato, é preciso copiar texto, abrir o WhatsApp, voltar, mudar etapa e agendar o próximo passo à mão. Trabalho duplicado = abandono.
3. **As etapas do funil não refletem o processo real.** Hoje: Novo → Contato → Proposta → Fechado. O processo real tem "Mensagem enviada", "Respondeu", "Reunião", follow-ups com prazo, "Sem interesse".
4. **Não há sensação de progresso.** Nada mostra quantos contatos foram feitos na semana, quantas respostas vieram, quanto falta para a meta.
5. **Toda a inteligência (mensagens, respostas a objeções, análise de anúncios) está acontecendo fora do app**, em conversas com IA. O usuário quer que isso viva dentro do LeadNexi.

### 0.4 Visão
> Abrir o LeadNexi de manhã, ver em 5 segundos o que precisa ser feito hoje, executar cada ação em 1–2 cliques (com a mensagem já escrita pela IA e o WhatsApp abrindo sozinho), e ver o placar da semana subir.

Meta de uso: **10–15 minutos por dia** resolvem toda a prospecção.

---

## 1. Princípios de produto e design

1. **Ação antes de dado.** Toda tela responde "o que eu faço agora?". Tabelas e relatórios são secundários.
2. **Um clique para agir.** Cada pendência tem um botão principal que executa a ação (abrir WhatsApp com texto pronto, responder no Direct, marcar como feito).
3. **O app trabalha pelo usuário.** Depois de uma ação, o próximo passo é agendado automaticamente (cadência), sem formulário.
4. **IA sugere, humano decide.** A IA escreve mensagens, sugere respostas e resume conversas. **Nada é enviado sem o clique do usuário.**
5. **Acolhedor, não corporativo.** Linguagem em português informal ("Bom dia, Benedito"), microcomemorações, cores quentes da marca, estados vazios que orientam em vez de só dizer "vazio".
6. **Mobile primeiro.** Boa parte do uso será no celular, ao lado do WhatsApp. Tudo precisa funcionar bem em 390 px de largura.
7. **Honestidade nos números.** O app nunca inventa número. Todo valor exibido vem de dado registrado.

---

## 2. Estado atual (observado em 15/10/2026)

| Aba | O que existe | Observações |
|---|---|---|
| **Hoje** | Lista de contatos agendados para o dia; estado vazio "Nenhum contato agendado". | Sem placar, sem fila de prospecção, sem atalhos. |
| **Funil** | Kanban com colunas Novo, Contato, Proposta, Fechado (+ adicionar coluna). Cards com nome, origem, valor, tempo parado. Indicadores no topo: Leads no funil, Em negociação (R$), Taxa de conversão, Fechado (R$). Busca e "Novo lead". | Etapas genéricas. Indicadores bons, mas sem meta. |
| **Leads** | Tabela: Nome, Contato, Origem, Etapa, Valor, Atualizado. Filtros por etapa e origem. Busca. "Importar planilha". "Novo lead". | Faltam colunas úteis (bairro, nota Google, nº avaliações, anuncia?, próximo passo). |
| **Detalhe do lead (modal)** | Abas "Histórico" e "Conversa" (Direct do Instagram, com aviso "Pode responder por mais X h"). "Próximo contato" com atalhos (Amanhã, Em 3 dias, Próxima segunda, Outra data). "Nova anotação" (Ctrl+Enter). Painel de dados: nome, telefone/WhatsApp, e-mail, Instagram, origem, valor estimado, observações. Excluir/Cancelar/Salvar. | Muito bom. Falta botão de WhatsApp, falta IA, falta etapa visível/editável no modal. |
| **Instagram** | Lista/grade de posts, "Novo post", publicação automática ligada, conta conectada (@vdigitalce), App da Meta configurado. | Conta conectada é a antiga; a marca atual é **@alvodigital.ce**. |

---

## 3. Roadmap por fases

Ordem recomendada. Cada fase entrega valor sozinha.

| Fase | Nome | Por que primeiro | Esforço estimado |
|---|---|---|---|
| **F0** | Dados vivos (migração e limpeza) | Sem dados reais nada mais importa | Pequeno |
| **F1** | "Hoje" como painel da manhã + fila de ações | Resolve o "não uso no dia a dia" | Médio |
| **F2** | Ação direta no WhatsApp + cadência automática | Elimina o trabalho duplicado | Médio |
| **F3** | Funil com as etapas reais + motivos de perda | Reflete o processo | Pequeno |
| **F4** | IA dentro do app (mensagens, respostas, resumos) | Tira o trabalho de escrever | Médio/Grande |
| **F5** | Placar, metas e progresso | Dá motivação e mede a regra de decisão | Pequeno/Médio |
| **F6** | Gerador de lista (Google Maps + Biblioteca de Anúncios) | Acaba com a montagem manual de listas | Grande |
| **F7** | Visual acolhedor, mobile e PWA | Faz querer abrir | Médio |
| **F8** | Instagram/conteúdo integrado à operação | Fecha o ciclo marca → lead | Médio |
| **F9** | Clientes ativos (pós-venda) | Para quando o 1º cliente fechar | Médio |

---

## F0 — Dados vivos

### Objetivo
O app precisa nascer com os leads reais e sem lixo.

### Tarefas
1. **Arquivar** (não apagar) os 12 leads de pet shop, em um "nicho/lista" chamado `Pet shops (arquivado)`. Eles não aparecem no Hoje nem no Funil por padrão.
2. **Importar** as 27 lojas de celular (CSV no Apêndice A) com status atual.
3. **Conceito de "Lista/Nicho"** (ver Modelo de dados): cada lead pertence a uma lista (ex.: "Lojas de celular · Fortaleza · out/2026"). Filtro global por lista no topo do app.
4. **Importador de planilha melhorado:**
   - Aceitar CSV/XLSX com mapeamento de colunas na tela (arrasta "Telefone" → campo WhatsApp).
   - Detectar duplicados por telefone normalizado ou @instagram e oferecer "pular / atualizar / duplicar".
   - Normalizar telefone para E.164 (`+5585987775441`).
   - Marcar telefones fixos (no Brasil, números que começam com 2–5 após o DDD costumam ser fixos) com o selo **"Fixo — talvez sem WhatsApp"**.
5. Reconectar o Instagram para **@alvodigital.ce** (ou permitir múltiplas contas e escolher a ativa).

### Critérios de aceite
- Após importar, o Funil mostra 27 leads de celular nas etapas corretas; pet shops só aparecem com o filtro "Arquivados".
- Importar o mesmo CSV duas vezes não cria duplicados.

---

## F1 — "Hoje" como painel da manhã

### Objetivo
Ao abrir o app, o usuário vê **o que fazer hoje, em ordem**, e o progresso da semana.

### Layout (desktop, de cima para baixo)

1. **Saudação + data:** "Bom dia, Benedito ☀️ · Quinta, 16 de outubro". Saudação muda com a hora (bom dia / boa tarde / boa noite).
2. **Resumo em uma linha** gerado a partir dos dados: "Hoje: 5 novos contatos, 2 follow-ups e 1 resposta pra tratar."
3. **Placar da semana** (4 cartões pequenos, com barra de progresso):
   - Contatos feitos: `12 / 30`
   - Respostas: `1` (taxa `8%`)
   - Reuniões marcadas: `0`
   - Faturado no mês: `R$ 0 / R$ 300` (meta configurável)
4. **Fila de ações de hoje** (coração da tela), agrupada e ordenada por prioridade:
   1. 🔴 **Responder** — leads que mandaram mensagem e ainda não foram respondidos (vindos do Direct; no WhatsApp, marcados manualmente — ver F2). Mostra há quanto tempo e, no Direct, quanto tempo resta na janela de 24 h.
   2. 🟠 **Follow-ups vencidos e de hoje** — leads em "Mensagem enviada" cuja data de follow-up chegou.
   3. 🟢 **Novos contatos** — próximos N leads "A contatar" da lista ativa (N = meta diária, padrão 5), ordenados por "pontuação do lead" (ver F6) ou por nº de avaliações.
   4. 📅 **Compromissos** — reuniões e "próximo contato" agendados manualmente.
5. **Card de ação** (cada item da fila):
   - Avatar/inicial, nome, bairro, nota e avaliações do Google, selo "Anuncia" se aplicável, selo "Fixo" se aplicável.
   - Linha de contexto: "1ª mensagem" / "Follow-up 1 (dia 2)" / "Follow-up final (dia 5)" / "Respondeu há 3 h".
   - **Prévia da mensagem sugerida** (2 linhas, expandível e editável inline).
   - Botões: **[Abrir no WhatsApp]** (principal) · [Direct] · [Feito] · [Adiar ▾] (amanhã, 3 dias, segunda) · [Pular ▾] (sem WhatsApp, loja fechada, sem interesse...).
6. **Estado vazio inteligente:** se a fila estiver vazia, em vez de "nada pendente": "Fila zerada 🎉. Quer puxar mais 5 lojas da lista?" [Puxar 5] — ou, sem leads, "Sua lista acabou. Gerar nova lista?" (F6).
7. **Barra de foco:** "Modo prospecção" — percorre a fila um card por vez, em tela cheia, com atalhos de teclado (Enter = abrir WhatsApp, F = feito, A = adiar, P = pular, → = próximo). Mostra "3 de 8".

### Regras
- A meta diária de novos contatos é configurável (padrão 5). O app **não deixa** puxar mais que um limite configurável (padrão 8/dia) sem aviso: "Mandar muitas mensagens no mesmo dia aumenta o risco de restrição do WhatsApp."
- Intervalo sugerido entre mensagens: após marcar "Feito", o próximo card mostra um contador discreto "Sugestão: espere ~10 min" (não bloqueia).
- Horário comercial: fora de 8h–18h, os botões de envio mostram aviso "Fora do horário comercial — agendar para amanhã 10h?".

### Critérios de aceite
- Com os dados do Apêndice A, a tela Hoje mostra a fila correta (follow-ups dos 4 leads contatados em 15/10 aparecem em 17/10).
- Do clique em "Abrir no WhatsApp" até o lead mudar de etapa: no máximo 2 cliques.

---

## F2 — Ação direta no WhatsApp + cadência automática

### Objetivo
Executar a mensagem no WhatsApp com o texto pronto e deixar o app registrar e agendar sozinho.

### Abrir no WhatsApp
- Gera link `https://wa.me/<E164 sem +>?text=<mensagem URL-encoded>` e abre em nova aba (no celular, abre o app do WhatsApp).
- Ao voltar para a aba do LeadNexi (evento de foco da janela), aparece um **toast de confirmação**: "Enviou a mensagem para Ligeirinho Cell?" [Sim, enviei] [Não enviei]. "Sim" executa o mesmo que "Feito".
- **Não** usar API não oficial do WhatsApp nem envio automático (risco de banimento e contra a política do WhatsApp). O envio é sempre feito pelo usuário no próprio app do WhatsApp.

### "Feito" (registro automático)
Ao confirmar envio:
1. Cria atividade no histórico: "1ª mensagem enviada via WhatsApp" + texto enviado.
2. Move o lead de etapa (A contatar → Mensagem enviada).
3. Agenda o próximo passo da **cadência**.

### Cadência (sequência de contato)
Cadência padrão "Prospecção fria" (editável em Configurações):

| Passo | Quando | Template | Se não responder |
|---|---|---|---|
| 1 | Dia 0 | 1ª mensagem | agenda passo 2 |
| 2 | Dia 2 | Follow-up 1 | agenda passo 3 |
| 3 | Dia 5 | Follow-up final | move para "Sem resposta" (arquivável) |

- Dias corridos, pulando domingo (configurável).
- Se o lead **responder** em qualquer passo, a cadência para e o lead vai para "Respondeu", entrando no topo da fila como "Responder".
- Cadências adicionais: "Pós-reunião" (lembrete D+1 com proposta), "Reativação 30 dias" (para "Sem resposta").

### Registrar resposta do WhatsApp
Como não há integração oficial lida, oferecer:
- Botão **"Ele respondeu"** no card e no lead → abre campo para colar o texto da resposta (opcional) → move para "Respondeu".
- (Opcional, F4) Colar um **print** da conversa: a IA lê e resume (OCR/visão).

### Critérios de aceite
- Fluxo completo: card → WhatsApp abre com texto → volta → "Sim, enviei" → lead em "Mensagem enviada" com follow-up agendado para D+2.
- Lead que respondeu nunca recebe follow-up automático na fila.

---

## F3 — Funil com as etapas reais

### Etapas padrão (renomeáveis, reordenáveis)
1. **A contatar**
2. **Mensagem enviada** (subestado: passo da cadência 1/2/3)
3. **Respondeu**
4. **Reunião marcada** (com data/hora)
5. **Proposta enviada** (com valor)
6. **Fechou** (ganho)
7. **Perdido** (com motivo)

### Motivos de perda (lista fixa + "outro")
Sem resposta · Sem interesse · Já tem alguém · Sem verba · Preço · Número sem WhatsApp · Loja fechada · Outro.
Ao arrastar para "Perdido", pedir o motivo em um clique.

### Card do Kanban
- Nome, bairro, selos (Anuncia / Fixo / Rede), próximo passo com data ("Follow-up 1 · amanhã"), dias parado (fica laranja após 3 dias sem ação, vermelho após 7).
- Valor quando houver proposta.

### Indicadores do topo (manter e ajustar)
- Leads ativos · Respostas (taxa) · Em negociação (R$) · Fechado no mês (R$ vs meta).
- Taxa de resposta = leads que chegaram a "Respondeu" ou além ÷ leads contatados.

### Critérios de aceite
- Drag & drop continua funcionando; mover para "Perdido" exige motivo.
- Indicadores batem com a soma dos leads.

---

## F4 — IA dentro do app

### Objetivo
Trazer para o app o trabalho que hoje é feito conversando com IA: escrever mensagens personalizadas, responder objeções, resumir conversas e preparar análises.

### Regras de ouro (guardrails, valem para todos os recursos)
1. **Nunca enviar nada automaticamente.** IA só preenche campos; o usuário revisa e envia.
2. **Nunca inventar número, resultado ou depoimento.** Só usar números do "Banco de provas" (ver abaixo) ou dados do próprio lead.
3. **Nunca prometer resultado** (proibido: "garantido", "5x mais vendas", "explodir vendas").
4. Tom: direto, informal, educado, frases curtas, "pra", sem gíria pesada, 0–1 emoji.
5. Em mensagens frias: não criticar o anúncio do lead, não listar o que ele anuncia (soa invasivo), não pedir contato de forma seca.

### 4.1 "Gerar mensagem" (1ª mensagem, follow-ups)
- Botão no card da fila e no lead.
- Contexto enviado ao modelo: nome da loja, bairro, nota/avaliações Google, se anuncia (e há quanto tempo), canal (WhatsApp/Direct), passo da cadência, horário (bom dia/boa tarde), histórico do lead, templates base (Apêndice B), Banco de provas.
- Saída: 1 mensagem + 2 variações (o usuário escolhe). Mostrar contador de caracteres.
- Estratégia em 2 passos (padrão aprendido na prática): a 1ª mensagem para o número da loja **pede o melhor jeito de falar com o responsável**; o pitch vai só para quem decide.

### 4.2 "Sugerir resposta" (na aba Conversa e no "Ele respondeu")
- Lê a última mensagem do lead e o histórico.
- Classifica a intenção: interessado · pediu preço · objeção (qual) · encaminhou para outra pessoa · resposta automática/robô · sem interesse.
- Sugere resposta seguindo o **método de objeções** (Apêndice C): reconhecer em 1 linha → perguntar → responder curto com fato → fechar com pergunta.
- Exemplo real: a Mikkis Tech respondeu "já foi repassado ao setor responsável" → sugestão: agradecer e pedir o nome de quem cuida, para o follow-up.
- Se for **resposta automática** (ex.: "Bem vindo à loja X, como podemos te servir?"), a IA avisa: "Parece resposta automática — ninguém leu ainda" e sugere aguardar ou reenviar a pergunta curta.

### 4.3 "Resumir conversa"
- Gera 3 linhas no topo do lead: situação, o que o lead quer, próximo passo sugerido (com botão para agendar).

### 4.4 "Próximo passo sugerido"
- Em cada lead parado, a IA sugere a ação (ex.: "Follow-up com o nome do responsável", "Tentar Direct, número sem WhatsApp").

### 4.5 "Análise grátis" (gerador de entregável)
- Para leads que aceitam a análise: gera uma **imagem vertical/PDF de 1 tela** com a identidade da Alvo Digital:
  - O que encontramos (anúncios ativos, para onde cada um leva: WhatsApp ou perfil, desde quando; nota e avaliações Google).
  - 3 oportunidades (tom de sugestão, sem criticar).
  - Resultado de referência (do Banco de provas).
  - Convite: conversa de 10 minutos.
- O usuário revisa os textos antes de exportar.

### 4.6 Banco de provas (configuração)
Lista de resultados reais, com fonte e data, que a IA pode citar. Seed:
- "Loja de celular em Fortaleza: R$ 2,26 por conversa no WhatsApp na melhor campanha (209 conversas, R$ 472,93). Fonte: Gerenciador de Anúncios, out/2026."
- "Mesma loja: 1.200 conversas no WhatsApp em 3 campanhas, R$ 4.554,71 investidos, média R$ 3,80. Fonte: Gerenciador de Anúncios, out/2025–out/2026."
- Regra: são **conversas iniciadas, não vendas**. Nome da loja só com autorização (campo "pode citar o nome? sim/não").

### 4.7 Implementação (orientação)
- Chamadas ao modelo feitas no backend (nunca expor chave no front).
- Cada recurso = 1 prompt de sistema versionado + contexto montado do lead.
- Guardar a sugestão escolhida no histórico (para aprender quais mensagens geram resposta — ver F5).
- Botão de feedback 👍/👎 em cada sugestão.

### Critérios de aceite
- Gerar mensagem para um lead do Apêndice A produz texto em português, com os dados certos da loja, sem números fora do Banco de provas.
- "Sugerir resposta" para a frase da Mikkis Tech sugere agradecer e pedir o nome do responsável.

---

## F5 — Placar, metas e aprendizado

### Metas (Configurações)
- Contatos por dia (padrão 5) e por semana (padrão 30).
- Faturamento mensal (padrão R$ 300).
- Regra de decisão: "a cada 30 contatos, mínimo de 2 respostas".

### Placar (em Hoje e numa aba "Resultados")
- Funil da semana e do mês: Contatados → Responderam → Reunião → Proposta → Fechou (contagem + %).
- **Alerta da regra de decisão:** ao atingir 30 contatos numa lista com < 2 respostas: "Regra de decisão: troque o nicho ou a mensagem, não o canal." com atalhos [Ver mensagens usadas] [Gerar nova lista].
- **Sequência (streak):** dias seguidos batendo a meta diária. Comemoração leve ao bater (confete discreto, 1 vez por dia).
- **Teste de mensagens:** taxa de resposta por template/variação de mensagem (qual 1ª mensagem responde mais).
- Tempo médio até a 1ª resposta.

### Critérios de aceite
- Números do placar batem com o histórico.
- O alerta aparece exatamente no 30º contato da lista quando a condição é verdadeira.

---

## F6 — Gerador de lista (Google Maps + Biblioteca de Anúncios)

### Objetivo
Montar a lista de prospecção dentro do app, em vez de pedir para a IA.

### Fluxo
1. "Nova lista" → nicho (ex.: "loja de celular"), cidade/bairros (padrão Fortaleza), quantidade alvo (ex.: 30).
2. Busca via **Google Places API** (Text Search / Nearby): nome, endereço, bairro, nota, nº de avaliações, telefone, site, link do Maps, place_id.
3. Filtros automáticos e manuais:
   - Excluir fechados permanentemente.
   - Marcar redes grandes (vários endereços com mesmo nome) com selo "Rede" (abordagem diferente: falar com marketing central).
   - Marcar telefones fixos.
   - Permitir excluir manualmente (ex.: avaliações citando problema legal).
4. Enriquecimento:
   - **Biblioteca de Anúncios da Meta:** a busca por palavra-chave procura no texto dos anúncios e gera falso negativo; o certo é identificar a **página** do anunciante. Implementar: buscar páginas candidatas pelo nome, deixar o usuário confirmar a página certa (mostrando seguidores/categoria), e então ler anúncios ativos (quantidade, data de início, destino: WhatsApp/perfil/site). Guardar `ad_status` = anuncia / não anuncia / não verificado, com data da checagem. Observação: para anúncios comuns no Brasil, a Biblioteca só mostra os **ativos**.
   - Instagram da loja (link e @), quando encontrado.
5. **Pontuação do lead** (0–100) para ordenar a fila: mais avaliações = mais movimento; anuncia = já valoriza tráfego (prioridade); nota alta = reputação para usar na mensagem; tem WhatsApp celular = contato fácil. Fórmula simples e transparente, exibida no lead ("Por que 82?").

### Critérios de aceite
- Gerar lista de 30 lojas de celular em Fortaleza e importá-las sem duplicar as existentes.
- Cada lead mostra de onde veio cada dado (Google, Biblioteca, manual) e quando foi checado.

---

## F7 — Visual acolhedor, mobile e PWA

### Identidade
Usar a identidade da Alvo Digital (o app é a ferramenta da marca):
- Tinta `#0F1C2E` (fundo escuro/texto), Laranja `#FF5B1F` (destaque, CTA), Névoa `#F3F4F1` (fundo claro), Grafite `#5A6472` (texto secundário).
- Títulos: Archivo 800. Texto: IBM Plex Sans.
- Laranja só para ação principal e destaques; não usar em tudo.
- Modo escuro já existe: manter e ajustar à paleta.

### Acolhimento
- Saudação personalizada e frases de apoio curtas ("Primeira mensagem do dia enviada 👊", "Fila zerada, bom trabalho").
- Microcomemorações: ao mover para "Respondeu" (vibração/animação leve), ao "Fechou" (confete + "Primeiro cliente! 🎉" na 1ª vez).
- Estados vazios com ilustração simples e um botão que leva à próxima ação.
- Tempo relativo humano ("há 2 h", "amanhã de manhã").

### Mobile
- Navegação inferior com 4 itens: Hoje · Funil · Leads · Mais.
- Card de ação ocupando a largura, botão "Abrir no WhatsApp" grande (área de toque ≥ 44 px).
- Modo prospecção com swipe (direita = feito, esquerda = adiar).

### PWA
- Instalável na tela inicial, ícone da Alvo Digital.
- Notificação diária às 9h45 (opcional): "5 lojas te esperando hoje + 2 follow-ups."
- Notificação quando chega mensagem no Direct.

### Critérios de aceite
- Toda a tela Hoje usável com uma mão em 390 px.
- Lighthouse PWA "instalável".

---

## F8 — Instagram e conteúdo integrados à operação

1. **Calendário de conteúdo** (semana/mês) com posts agendados e publicados; arrastar para remarcar.
2. Tipos: post, carrossel (múltiplas imagens), Reel (vídeo) se a API permitir; legenda com contador e hashtags salvas.
3. **Ligação conteúdo → prospecção:** marcar posts como "prova" (ex.: carrossel de case) e oferecer link do post como anexo sugerido no follow-up ("Te mando um exemplo do que fizemos").
4. Inbox do Direct: lista de conversas com etiqueta "lead / não lead"; transformar conversa em lead com 1 clique (já existe parcialmente — manter).
5. Conta ativa: @alvodigital.ce.

---

## F9 — Clientes ativos (pós-venda) — quando fechar o 1º cliente

- Ao mover para "Fechou": criar **ficha de cliente** com: plano (R$ 500 1º mês), data de início, dia de cobrança, verba diária de anúncio combinada, acesso ao Gerenciador (checklist: acesso de parceiro no Business Manager — nunca pedir senha), WhatsApp Business do cliente com saudação automática configurada (checklist).
- **Relatório semanal**: campos para gasto, conversas, custo por conversa (manual ou via Meta Marketing API se conectada), com geração de mensagem-resumo para enviar ao cliente.
- **Cobrança**: lembrete de renovação 3 dias antes; registro de Pix recebido.
- Caso de sucesso: botão "Adicionar ao Banco de provas" (com autorização do cliente).

---

## 4. Modelo de dados sugerido

> Adaptar ao que já existe. Campos novos marcados com ★.

**Lead**
- id, nome, instagram, telefone (E.164), ★telefone_tipo (celular/fixo/desconhecido), ★tem_whatsapp (sim/não/desconhecido), email, origem (Google Maps/Instagram/Planilha/Indicação/Manual), ★lista_id, etapa_id, ★passo_cadencia, ★proximo_passo_em (datetime), ★proximo_passo_tipo, valor_estimado, observações, ★bairro, ★endereco, ★maps_url, ★place_id, ★google_nota, ★google_avaliacoes, ★anuncia (sim/não/não verificado), ★anuncios_ativos (int), ★anuncio_desde (date), ★anuncio_destino (whatsapp/perfil/site/misto), ★meta_page_id, ★ads_checado_em, ★rede (bool), ★pontuacao, ★motivo_perda, ★responsavel_nome, created_at, updated_at, ★arquivado.

**Lista** ★
- id, nome, nicho, cidade, criada_em, meta_contatos, arquivada.

**Etapa**
- id, nome, ordem, tipo (aberta/ganho/perdido), cor.

**Atividade** (histórico)
- id, lead_id, tipo (mensagem_enviada, resposta_recebida, nota, mudanca_etapa, ligacao, reuniao, ia_sugestao_usada), canal (whatsapp/direct/telefone/presencial), texto, ★template_id, ★variacao, criado_em.

**Cadência** ★
- id, nome, passos[{ordem, dias_apos, template_id, acao_se_sem_resposta}], pular_domingo.

**Template** ★
- id, nome, canal, passo, texto (com variáveis `{loja}`, `{bairro}`, `{nota}`, `{avaliacoes}`, `{saudacao}`, `{responsavel}`), ativo.

**Prova** ★ (Banco de provas)
- id, texto, numero_destaque, fonte, data, pode_citar_nome (bool), ativo.

**Meta** ★
- contatos_dia, contatos_semana, faturamento_mes, limite_dia, regra_decisao {contatos: 30, min_respostas: 2}.

**Cliente** ★ (F9)
- lead_id, plano, valor_mensal, inicio, dia_cobranca, verba_diaria, checklist_onboarding{...}, relatorios[...].

---

## 5. Integrações

| Integração | Uso | Observações |
|---|---|---|
| `wa.me` deep link | Abrir conversa com texto pronto | Sem API não oficial. Sem envio automático. |
| Instagram Graph API (já existe) | Direct dentro do lead, publicação de posts | Trocar conta para @alvodigital.ce. Respeitar janela de 24 h para responder. |
| Google Places API | Gerar listas (F6) | Custo por requisição; cachear por place_id. |
| Meta Ad Library | Saber se o lead anuncia (F6) | Identificar a **página** certa; só ativos aparecem para anúncios comuns no BR. |
| Meta Marketing API (opcional) | Puxar números de campanhas de clientes e do Banco de provas | Só para contas com acesso. |
| Modelo de IA (backend) | F4 | Chave só no servidor; log de prompts/saídas para depuração. |

---

## 6. Fora de escopo / riscos

- **Envio em massa ou automático no WhatsApp:** proibido no produto. O WhatsApp restringe números muito bloqueados/denunciados; o app deve reforçar volume baixo e mensagens personalizadas.
- **LGPD:** os dados são de empresas (públicos no Google), mas telefones podem ser de pessoas. Guardar o mínimo, permitir excluir um lead por completo, nunca compartilhar.
- **Promessas de resultado:** a IA e os templates nunca prometem vendas ou faturamento.

---

## 7. Ordem de execução sugerida para o Codex

1. F0 (migração, listas, importador com deduplicação) → testar com o CSV do Apêndice A.
2. F3 (etapas reais + motivos de perda) — base para o resto.
3. F2 (wa.me + "Feito" + cadência) — lógica de próximo passo.
4. F1 (tela Hoje com fila, placar simples e modo prospecção).
5. F5 (metas, placar completo, regra de decisão).
6. F4 (IA: gerar mensagem → sugerir resposta → resumir → análise grátis).
7. F7 (visual, mobile, PWA, notificações).
8. F6 (gerador de lista).
9. F8 e F9.

Cada fase: abrir PR separado, com screenshots desktop e mobile.

---

## Apêndice A — Leads reais para importar (CSV)

Status em 15/10/2026. Telefones do Google Maps. "Fixo" = provável telefone fixo.

```csv
nome,bairro,google_nota,google_avaliacoes,telefone,telefone_tipo,maps_url,etapa,passo_cadencia,proximo_passo_em,anuncia,observacoes
Ligeirinho Cell,Centro,4.9,1100,+5585987775441,celular,https://www.google.com/maps/search/?api=1&query=Ligeirinho+Cell+Fortaleza&query_place_id=ChIJmRE95cJJxwcRdJPkwr-MW1I,Mensagem enviada,1,2026-10-17,nao,"1ª msg (pedir responsável) 15/10"
FG Store iPhones,Fátima,5.0,1334,+5585988119062,celular,https://www.google.com/maps/search/?api=1&query=FG+Store+iPhones+Fortaleza&query_place_id=ChIJbd0d3CFJxwcRiyDDSjTRE9M,Mensagem enviada,1,2026-10-17,nao,"1ª msg 15/10"
Miami Cases,José de Alencar,5.0,486,+5585994343375,celular,https://www.google.com/maps/search/?api=1&query=Miami+Cases+Fortaleza&query_place_id=ChIJJQ1Y1plFxwcRoRZbcdPyWTA,A contatar,0,,nao,"Rede com 10+ lojas (@miamicases). Números testados sem WhatsApp. Tentar Direct pelo app do celular; pedir contato do marketing da rede"
Mikkis Tech,Dionísio Torres,5.0,459,+5585985741251,celular,https://www.google.com/maps/search/?api=1&query=Mikkis+Tech+Fortaleza&query_place_id=ChIJs0VuYtVJxwcRMpq0wdIowB4,Respondeu,1,2026-10-20,sim,"Anuncia: 2 anúncios ativos desde 10 e 13/09 (um leva pro perfil, outro pro WhatsApp). Respondeu: 'já foi repassado ao setor responsável'. Pedido o nome do responsável. Direct @mikkis.tech: só resposta automática. Análise grátis pronta"
World Tech,Centro,5.0,423,+5585985858812,celular,https://www.google.com/maps/search/?api=1&query=World+Tech+Fortaleza&query_place_id=ChIJERIAJq5JxwcRbJ4n_PAN1Kc,A contatar,0,,nao_verificado,"Página do Facebook não encontrada"
Smartphone Service,Aldeota,4.9,401,+558530211055,fixo,https://www.google.com/maps/search/?api=1&query=Smartphone+Service+Fortaleza&query_place_id=ChIJWySRGIhIxwcRRH0KMJ98aSs,A contatar,0,,nao_verificado,"Telefone fixo. Página duvidosa na Biblioteca (anúncio cita 'Dr. Notebook')"
LogyCell Tech,Centro,5.0,375,+5585997504133,celular,https://www.google.com/maps/search/?api=1&query=LogyCell+Tech+Fortaleza&query_place_id=ChIJ4TCHc5VJxwcRaNgBtEkkcm8,A contatar,0,,nao_verificado,"Página não encontrada"
TechCell Soluções,Centro,4.5,321,+5585988550233,celular,https://www.google.com/maps/search/?api=1&query=TechCell+Solucoes+Fortaleza&query_place_id=ChIJb4UUV_hIxwcRbX2bh4ui7oQ,Mensagem enviada,1,2026-10-17,nao,"1ª msg 15/10"
Bcases Messejana,Messejana,4.9,301,+5585999337638,celular,https://www.google.com/maps/search/?api=1&query=Bcases+Messejana+Fortaleza&query_place_id=ChIJd7Et9Q5PxwcRO-NRQq3o1-k,Mensagem enviada,1,2026-10-17,nao,"1ª msg 15/10"
Cell Express,Aldeota,4.8,278,+558530255657,fixo,https://www.google.com/maps/search/?api=1&query=Cell+Express+Fortaleza&query_place_id=ChIJAdCZaohIxwcRSkObbBHq0Og,A contatar,0,,nao_verificado,"Fixo. Página 'Cell Express' tem 2 anúncios ativos desde ago (parcelado no boleto) — confirmar se é a da Aldeota e pegar WhatsApp no Instagram"
Sr. iPhone,Fátima,4.9,240,+5585998143492,celular,https://www.google.com/maps/search/?api=1&query=Sr+iPhone+Fortaleza&query_place_id=ChIJVWO0PXpJxwcRB04GbRWSUMI,A contatar,0,,nao_verificado,
Quality Cell,Aldeota,4.5,134,+558532649604,fixo,https://www.google.com/maps/search/?api=1&query=Quality+Cell+Fortaleza&query_place_id=ChIJNbeyvWNIxwcRCRmX-8QmAFU,A contatar,0,,nao_verificado,"Fixo"
Danicell,Vila Velha,4.7,123,+5585992662359,celular,https://www.google.com/maps/search/?api=1&query=Danicell+Fortaleza&query_place_id=ChIJnRAf7CpLxwcRUjIjx4nGiPg,A contatar,0,,nao_verificado,
Casa do Celular,Parangaba,3.4,105,+5585981451823,celular,https://www.google.com/maps/search/?api=1&query=Casa+do+Celular+Parangaba&query_place_id=ChIJK8SHVotPxwcRWVzpYO0pNZA,A contatar,0,,nao_verificado,"Nota baixa: não usar a nota na mensagem"
Im Up (rede),Cocó,5.0,1702,+558530256679,fixo,https://www.google.com/maps/search/?api=1&query=Im+Up+Coco+Fortaleza&query_place_id=ChIJmY-GraVHxwcR0q9LVRHMPII,A contatar,0,,nao_verificado,"Rede (2 lojas). Fixo"
TechStore Cell,Centro,4.5,94,+5585986703490,celular,https://www.google.com/maps/search/?api=1&query=TechStore+Cell+Fortaleza&query_place_id=ChIJ_WmwBatJxwcRzJCu9NhIA2Y,A contatar,0,,nao_verificado,
CentroCell Grand Shopping,Messejana,4.9,44,+5585997958292,celular,https://www.google.com/maps/search/?api=1&query=CentroCell+Grand+Shopping+Messejana&query_place_id=ChIJ097UZudPxwcRpLkDVrTVFN8,A contatar,0,,nao_verificado,
Lagoa Cell Importados,Parangaba,5.0,35,+5585987985842,celular,https://www.google.com/maps/search/?api=1&query=Lagoa+Cell+Importados+Fortaleza&query_place_id=ChIJH6vTmjdNxwcRi8tkGNrSMHU,A contatar,0,,nao_verificado,
Ace Cell,Messejana,4.7,31,+5585994511878,celular,https://www.google.com/maps/search/?api=1&query=Ace+Cell+Messejana&query_place_id=ChIJa2OQRatPxwcRg_WrgQrEx3c,A contatar,0,,nao_verificado,
i.Solutions,Aldeota,3.7,31,+558532152835,fixo,https://www.google.com/maps/search/?api=1&query=i.Solutions+Fortaleza&query_place_id=ChIJSTELQ4hIxwcRWQ5wwbSHdhg,A contatar,0,,nao_verificado,"Fixo. Nota baixa"
Iservice / Conserto de iPhone,Meireles,4.7,30,+5585999905200,celular,https://www.google.com/maps/search/?api=1&query=Conserto+de+iPhone+Fortaleza&query_place_id=ChIJ5RAgBStJxwcRtE8PMw5Jp88,A contatar,0,,nao_verificado,
Louyse Cell,Messejana,3.3,24,+558539231389,fixo,https://www.google.com/maps/search/?api=1&query=Louyse+Cell+Fortaleza&query_place_id=ChIJDzX-F-1PxwcRCmyHz-HGaAo,A contatar,0,,nao_verificado,"Fixo. Nota baixa"
AN Tech,Parangaba,4.0,20,+5585991386937,celular,https://www.google.com/maps/search/?api=1&query=AN+Tech+Parangaba&query_place_id=ChIJf5IZ88JPxwcRPrxImDQRMjo,A contatar,0,,nao_verificado,
ilego fortal,Jacarecanga,4.5,17,+5585994214471,celular,https://www.google.com/maps/search/?api=1&query=ilego+fortal&query_place_id=ChIJPzWZR2FJxwcRF-ZIBfjOm5s,A contatar,0,,nao_verificado,
AJ iPhones,Mondubim,5.0,11,+5585987237909,celular,https://www.google.com/maps/search/?api=1&query=AJ+iPhones+Fortaleza&query_place_id=ChIJ1-fR1jRPxwcRqN1QVIwVBb0,A contatar,0,,nao_verificado,
PH Import,Parangaba,3.9,11,+5585997461881,celular,https://www.google.com/maps/search/?api=1&query=PH+Import+Parangaba&query_place_id=ChIJf6xG8jhPxwcRgpwRkwzQ17k,A contatar,0,,nao_verificado,
Infinity Cel,Parangaba,4.1,7,+558533083555,fixo,https://www.google.com/maps/search/?api=1&query=Infinity+Cel+Parangaba&query_place_id=ChIJ69RdTaROxwcRM7vW1c-f-6E,A contatar,0,,nao_verificado,"Fixo"
```

---

## Apêndice B — Templates de mensagem (seed)

Variáveis: `{saudacao}` (Bom dia/Boa tarde), `{loja}`, `{nota}`, `{avaliacoes}`, `{responsavel}`, `{dia}`.

**B1. 1ª mensagem — número da loja (pedir o responsável)** *(padrão atual)*
> Oi, {saudacao}! Tudo bem? Me chamo Benedito, sou da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios no Instagram pra lojas de celular e gostaria de apresentar meu trabalho pro responsável da loja.
>
> Você consegue me dizer qual o melhor jeito de falar com ele? Obrigado!

**B2. 1ª mensagem — rede (marketing central)**
> Oi, {saudacao}! Tudo bem? Me chamo Benedito, sou da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios no Instagram pra lojas de celular e gostaria de apresentar meu trabalho pra quem cuida do marketing da rede {loja}.
>
> Você consegue me dizer qual o melhor jeito de falar com essa pessoa? Obrigado!

**B3. Pitch — para o responsável (loja que já anuncia)**
> Oi, tudo bem? Sou o Benedito, da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios no Instagram e no Facebook pra lojas de celular.
>
> Vi que a {loja} já anuncia por lá, e com a reputação que vocês têm no Google ({nota} com {avaliacoes} avaliações) faz todo sentido.
>
> Queria te perguntar: os anúncios têm trazido bastante gente pro WhatsApp de vocês? Se quiser, posso te oferecer uma análise gratuita dos anúncios. Acredito que tem alguns pontos que dá pra potencializar e trazer mais clientes.

**B4. Pitch — para o responsável (loja que não anuncia)**
> Oi, tudo bem? Sou o Benedito, da Alvo Digital, aqui de Fortaleza. Trabalho com anúncios pra lojas de celular.
>
> Vi a {loja} no Google: {nota} estrelas e {avaliacoes} avaliações. A reputação de vocês é forte, e dá pra transformar isso em mais cliente chegando no WhatsApp.
>
> Numa campanha recente pra uma loja de celular aqui de Fortaleza, cada conversa no WhatsApp saiu a R$ 2,26.
>
> Posso te mostrar em 10 minutos como ficaria pra vocês? O 1º mês sai por R$ 500, sem fidelidade.

**B5. Follow-up 1 (dia 2)**
> Oi! Só retomando a mensagem de {dia}. Se fizer sentido, te mando um exemplo de anúncio pra {loja}, sem compromisso. Se não for o momento, tudo bem também.

**B6. Follow-up final (dia 5)**
> Última mensagem pra não te incomodar 🙂 Se um dia quiser uma análise grátis dos anúncios da {loja}, é só me chamar aqui.

**B7. Resposta a "já foi repassado ao responsável"**
> Muito obrigado! 😊 Se puder, me diz o nome de quem cuida desse setor, pra eu saber com quem falar quando der retorno?

**B8. Proposta curta (após diagnóstico)**
> Pelo que você me contou, eu faria assim:
> ✅ Campanha de mensagens no Gerenciador, só pra quem está perto da loja
> ✅ Anúncios focados em {produto}
> ✅ Relatório toda semana: quanto gastou e quanto custou cada conversa
> 💰 Meu serviço: R$ 500 no 1º mês, sem fidelidade
> 📢 Verba do anúncio: você escolhe, paga direto pra Meta no seu cartão
> Faz sentido pra você?

---

## Apêndice C — Método de objeções (para a IA "Sugerir resposta")

Método (base: análise da Gong com 67 mil ligações de venda): **pausar → perguntar → responder curto com fato → fechar com pergunta**. Nunca textão, nunca prometer resultado, nunca falar mal de concorrente, nunca insistir após "não" claro.

| Objeção | Pergunte primeiro | Depois responda |
|---|---|---|
| "Tá caro" | "Entendo. Caro comparado com o quê? Você já investe em divulgação hoje?" | "O 1º mês é R$ 500, sem fidelidade. A ideia é você ver o custo de cada conversa antes de decidir continuar." |
| "Eu mesmo já impulsiono" | "Massa! E o que você mais recebe hoje: curtida ou mensagem no WhatsApp?" | "O impulsionar é feito pra engajamento. Campanha de mensagens no Gerenciador gera conversa e dá pra limitar a região perto da loja. Posso te mostrar a diferença em 10 min?" |
| "Vou pensar" | "Claro! O que ficou em dúvida: preço, resultado ou tempo?" | Responder a dúvida real. Se for tempo: "Te chamo {dia} pra gente ver, pode ser?" |
| "Já tenho alguém" | "Ótimo! Ele te passa quanto custa cada conversa no WhatsApp?" | "Se quiser, faço uma análise grátis dos anúncios atuais, só pra ter uma segunda opinião." |
| "Não tenho verba" | "Quanto você consegue separar por dia, mesmo pouco?" | "Dá pra começar pequeno e aumentar só se o custo por conversa compensar." |
| "Já tentei e não deu certo" | "Lembra qual era o objetivo da campanha e pra qual região aparecia?" | Mostrar qual dos 3 erros foi (impulsionar, cidade inteira, demora no WhatsApp) e como corrige. |
| "Me manda as informações" | "Mando sim! Hoje vocês recebem mais cliente pelo Instagram, Google ou indicação?" | Mensagem curta com oferta + o que inclui + "posso te ligar 5 min amanhã?" |

---

## Apêndice D — Glossário

- **Conversa iniciada:** pessoa que clicou no anúncio e mandou mensagem no WhatsApp. Não é venda.
- **Custo por conversa:** gasto ÷ conversas iniciadas.
- **Cadência:** sequência de contatos com prazos (dia 0, 2, 5).
- **Regra de decisão:** a cada 30 contatos, < 2 respostas → trocar nicho ou mensagem.
- **Janela de 24 h (Instagram):** prazo para responder um Direct depois da última mensagem do usuário.
