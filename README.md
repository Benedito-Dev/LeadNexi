# LeadNexi

CRM pessoal: gestão de leads, pipelines Kanban customizáveis e, futuramente, WhatsApp e agendamento de posts no Instagram.

## Estrutura

```
LeadNexi/
├── docker-compose.yml     # Postgres local (porta 5435)
├── docs/brand/BRAND.md    # guia de marca e interface (fonte da verdade visual)
├── backend/               # NestJS + Prisma 7
│   ├── prisma/            # schema.prisma e migrations
│   └── src/
│       ├── auth/          # login JWT + refresh token (cookie), guard global, limite de tentativas
│       ├── pipelines/     # funis do Kanban
│       ├── stages/        # etapas (colunas) e reordenação
│       ├── leads/         # CRUD, busca/paginação, movimentação dos cards e histórico
│       ├── instagram/     # conexão com o Instagram (OAuth), posts agendados e cron diário
│       ├── ai/            # IA (Claude): mensagens, respostas, resumo, análise grátis e banco de provas
│       ├── clients/       # clientes ativos: ficha, relatórios semanais, pagamentos e lembretes
│       ├── storage/       # armazenamento de arquivos no padrão S3 (imagens dos posts)
│       ├── health/        # health check público
│       ├── common/        # filtro de erros do Prisma, utilitários de posição
│       ├── prisma/        # PrismaService (global)
│       └── generated/     # Prisma Client (gerado, fora do git)
└── frontend/              # React + Vite, em reconstrução (tela em branco)
    ├── public/brand/      # SVGs da marca (símbolo, logo, favicon, ícones de app)
    ├── public/*.html      # páginas legais estáticas (/privacidade, /exclusao-de-dados)
    └── src/               # App vazio
```

## Rodando localmente

```bash
docker compose up -d

cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed         # cria seu usuário (SEED_USER_*) e o pipeline "Vendas"
npm run start:dev          # http://localhost:3000/api  (Swagger: /api/docs)

cd ../frontend
npm install
npm run dev                # http://localhost:5173
```

### Tudo no Docker

```bash
cp backend/.env.example backend/.env     # troque o JWT_SECRET
docker compose up -d --build             # front: http://localhost:8080 · API: http://localhost:3000/api
docker compose exec backend npx prisma db seed
```

O backend aplica as migrations ao subir. O front é servido por um nginx que repete o roteamento do `vercel.json` (`/api` vai para o backend).

## API

Todas as rotas ficam sob `/api` e exigem `Authorization: Bearer <token>`, exceto login, refresh, logout e `GET /health`.

**Sessão:** o login devolve um access token (JWT de 15 min, guardado só em memória no frontend) e grava o refresh token (30 dias) num cookie `lnx_refresh` httpOnly, `SameSite=Strict`, restrito a `/api/auth`. `POST /auth/refresh` troca o refresh por um novo a cada uso (rotação) e devolve outro access token; reapresentar um refresh já trocado encerra a sessão inteira (sinal de roubo). `POST /auth/logout` revoga a sessão no servidor. O login aceita 5 tentativas por minuto por IP. Senhas com scrypt. Em produção (`NODE_ENV=production`) o cookie sai com `Secure`.
A documentação completa (com "Try it out") está em **http://localhost:3000/api/docs**.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/me` (nome e e-mail) · `POST /auth/password` (troca a senha e encerra as outras sessões) · `POST/DELETE /auth/me/avatar` (foto de perfil, JPEG) · `GET /auth/avatars/:id` (a foto, pública) |
| Pipelines | `GET /pipelines` · `GET /pipelines/:id` (Kanban completo) · `POST` · `PATCH /:id` · `DELETE /:id` |
| Stages | `POST /pipelines/:id/stages` · `PATCH /pipelines/:id/stages/reorder` · `PATCH /stages/:id` · `DELETE /stages/:id` |
| Leads | `GET /leads?search&pipelineId&stageId&source&page&limit` · `GET /leads/:id` · `POST` · `PATCH /:id` · `PATCH /:id/move` · `DELETE /:id` |
| Histórico do lead | `GET /leads/follow-ups` (agenda, atrasados primeiro) · `GET /leads/:id/activities` · `POST /leads/:id/notes` · `DELETE /leads/:id/notes/:activityId` · `PUT /leads/:id/follow-up` · `POST /leads/:id/follow-up/complete` · `DELETE /leads/:id/follow-up` |
| Instagram | `GET /instagram/settings` · `PUT /instagram/settings` (app da Meta: ID e chave secreta) · `GET /instagram/account` · `POST /instagram/connect` (link do login oficial) · `GET /instagram/callback` (volta do login, pública) · `DELETE /instagram/account` · `GET /instagram/webhook` (cadastro do webhook na Meta, público) · `POST /instagram/webhook` (avisos do direct, assinados pela Meta) |
| Posts do Instagram | `POST /instagram/media` (envia uma imagem JPEG, até 4 MB) · `GET /instagram/media/:id?token=` (imagem pelo link assinado, pública) · `GET /instagram/posts` · `POST /instagram/posts` (agenda; com `publishNow`, publica na hora) · `POST /instagram/posts/:id/publish` (publica agora ou tenta de novo) · `DELETE /instagram/posts/:id` (cancela) · `GET /instagram/publishing` (`{ automatic }`: os agendados saem sozinhos?) |
| IA | `GET /ai/status` · `POST /leads/:id/ai/message` (1 mensagem + 2 variações) · `POST /leads/:id/ai/reply` (classifica a última mensagem do lead e sugere a resposta) · `POST /leads/:id/ai/summary` (resumo + próximo passo, guardado no lead) · `POST /leads/:id/ai/analysis` (textos da análise grátis) · `POST /ai/caption` (legenda do post a partir das imagens, multipart `images`, até 10 JPEG) · `PATCH /ai/suggestions/:id` (opção usada e gostei/não gostei) |
| Banco de provas | `GET /proofs` · `POST /proofs` · `PATCH /proofs/:id` · `DELETE /proofs/:id` |
| MCP (Claude) | `GET /mcp/tokens` · `POST /mcp/tokens` (cria a senha de acesso; o token aparece só na resposta) · `DELETE /mcp/tokens/:id` (revoga) · `GET /mcp/actions` (últimas 20 ações do Claude) · `POST /mcp` (servidor MCP sem sessão, `Authorization: Bearer lnx_mcp_…`; leitura: `ver_hoje`, `buscar_leads`, `ver_lead`, `ver_resultados`, `listar_clientes`, `listar_etapas`; ação: `criar_lead`, `editar_lead`, `mover_lead`, `anotar`, `agendar_contato`, `registrar_resposta`, tudo no histórico com `via = "claude"`; conteúdo: `preparar_envio_de_imagem`, `preparar_envio_de_video`, `confirmar_envio`, `criar_rascunho_de_post`, `listar_rascunhos`, `listar_posts_agendados`, `agendar_post`; nenhuma envia mensagem) |
| Operação do Instagram | `GET /instagram/posts?from&to` (calendário: o que cai no período) · `PATCH /instagram/posts/:id` (remarcar agendado ou com falha; marcar publicado como exemplo) · `GET /instagram/posts/proofs` (exemplos para anexar no follow-up) · `GET /instagram/inbox` (conversas do direct) · `GET/POST /instagram/hashtag-sets` · `DELETE /instagram/hashtag-sets/:id` |
| Clientes | `GET /clients` · `GET /clients/reminders` (renovação em até 3 dias e relatório da semana passada pendente) · `GET /clients/:id` · `PATCH /clients/:id` · `PUT /clients/:id/reports` (uma semana; repetir substitui) · `DELETE /clients/:id/reports/:reportId` · `POST /clients/:id/payments` · `DELETE /clients/:id/payments/:paymentId` |
| Cron | `GET /cron/instagram-daily` (renova o token, apaga imagens soltas e remarca o despertador; exige `Authorization: Bearer <CRON_SECRET>`) · `POST /cron/instagram-publish` (despertador: publica o que venceu; assinatura do QStash ou `Bearer <CRON_SECRET>`) |

**Instagram:** "Conectar" leva ao login oficial do Instagram; a Meta devolve o navegador para `/api/instagram/callback`, que confere o `state` (JWT de 10 min), troca o código pelo token de 60 dias, lê o perfil (só contas profissionais) e volta para `/instagram?conectado=1` ou `?erro=negado|conta|expirado|falha`. O ID e a chave secreta do app da Meta são salvos pela própria tela (cartão "App da Meta"; a chave fica criptografada e nunca volta para o navegador); as variáveis `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET` só valem enquanto nada foi salvo pela tela. O endereço de retorno é montado a partir do endereço do site (a tela mostra o valor para colar na Meta); `INSTAGRAM_REDIRECT_URI` só é preciso para forçar outro. O token e a chave secreta ficam criptografados no banco (AES-256-GCM) com `TOKEN_ENCRYPTION_KEY` ou, sem ela, com uma chave derivada do `JWT_SECRET` (trocar a chave em uso obriga a salvar o app e conectar a conta de novo). Um cron diário renova os tokens que vencem em até 10 dias; se a Meta recusar o token, a tela pede para conectar de novo (`needsReconnect`).

**Direct vira lead:** o login pede também `instagram_business_manage_messages` e, ao conectar, liga os avisos de mensagem da conta (`POST /me/subscribed_apps`; `messagesEnabled` na conta). No app da Meta, "Configurar webhooks" recebe a URL de callback (`/api/instagram/webhook`) e o token de verificação que o cartão "App da Meta" mostra (derivado da chave de criptografia) e assina o campo `messages`; a Meta só manda avisos com o app publicado. Cada aviso é conferido pela assinatura `X-Hub-Signature-256` (HMAC do corpo original com a chave secreta do app; por isso o Nest sobe com `rawBody`). Mensagem de quem ainda não é lead cria o lead no fim da primeira etapa do primeiro funil, com nome e @ lidos da Meta (sem eles, "Contato do Instagram") e origem "Instagram"; cada mensagem entra no histórico (`INSTAGRAM_MESSAGE`), uma vez só (ID da Meta em `externalId`). Ecos (mensagens da própria conta), apagadas e avisos de outra conta são ignorados. A foto de perfil (`profile_pic`, cujo link da Meta expira em poucos dias) é baixada e guardada no armazenamento (`leads/avatars/<avatarId>.jpg`) no lead novo e, depois, conferida de novo no máximo uma vez por semana, a cada mensagem; `GET /api/leads/avatars/:avatarId` a entrega (pública, com cache longo: o ID muda a cada foto nova). Excluir o lead apaga a foto. As páginas públicas `/privacidade` e `/exclusao-de-dados` são as que a Meta pede para publicar o app; com o front em reconstrução, elas ficam como HTML estático em `frontend/public/` (estilo em `public/legal/legal.css`, apontadas no `vercel.json`), para o robô da Meta ler o texto sem rodar JavaScript.

**Posts do Instagram:** as imagens viram JPEG no navegador e sobem uma por requisição (a Vercel limita cada uma a 4,5 MB) para o armazenamento no padrão S3 (`STORAGE_*`; hoje Telnyx Cloud Storage). O bucket fica privado: a tela (e, na publicação, o Instagram) lê cada imagem por um link assinado da própria API, válido por 1 hora. Agendar prende as imagens ao post; cancelar apaga post e imagens; imagens enviadas que não entram em post em 24 h são apagadas pelo cron diário.

**Publicação:** cada imagem vira um contêiner na Meta (ela baixa a imagem pelo link assinado), o carrossel junta os contêineres na ordem e o contêiner final é publicado; o post guarda o link dele (`permalink`). "Publicar agora" publica na mesma requisição. Na hora marcada quem chama é um despertador: ao agendar, o backend pede ao QStash (Upstash) uma chamada para aquele minuto em `/api/cron/instagram-publish`, que publica o que venceu e arma o próximo despertador. Assim o banco só acorda quando há post para sair (um cron a cada minuto manteria o Neon acordado o tempo todo e gastaria o limite gratuito dele). Falha passageira da Meta tenta de novo em 1 minuto, até 3 vezes; recusa (proporção, limite de 100 posts por dia, token recusado etc.) vira "Falhou" com o motivo em português e "Tentar de novo". Cada post é pego numa condição do próprio `UPDATE`, então duas rodadas juntas não publicam duas vezes; "Publicando" parado há mais de 10 minutos vira "Falhou" pedindo para conferir no Instagram. Sem QStash configurado, a tela avisa que a publicação automática está desligada e só "Publicar agora" publica.

**IA (F4):** as chamadas à Claude (Anthropic) saem só do backend (`ANTHROPIC_API_KEY`; modelo em `ANTHROPIC_MODEL`, padrão `claude-opus-5-5`); sem a chave, os botões de IA ficam desligados e as rotas respondem 503. A IA só sugere: nada é enviado sozinho. Cada recurso tem um prompt de sistema versionado (`src/ai/prompts.ts`) com as regras de ouro, os templates do Apêndice B e o método de objeções do Apêndice C da spec; o contexto leva os dados do lead, os 40 últimos eventos do histórico, o banco de provas e a saudação no horário de Fortaleza. A resposta vem em JSON validado (saída estruturada) e, se a Claude recusar por política, a Anthropic tenta de novo no modelo reserva (`fallbacks: "default"`). Depois, o código confere as regras de ouro (`src/ai/guardrails.ts`): número que não está nos dados do lead nem no banco de provas, ou promessa de resultado, vira um aviso amarelo na sugestão. Toda resposta fica em `ai_suggestions` (contexto, saída, opção usada e avaliação); a mensagem usada no WhatsApp grava o template (`ia-B1`…) e a variação, que aparecem no "Teste de mensagens" em Resultados. O banco de provas é editado em Resultados.

**Operação do Instagram (F8):** a tela do Instagram ganha a visualização "Calendário" (semana ou mês): arrastar um post agendado ou com falha para outro dia mantém o horário (com falha volta a "Agendado", tentativas zeradas) e arma o despertador do novo horário; dia que já passou não aceita. Um post publicado pode ser marcado como exemplo ("Usar como exemplo", com descrição): ele aparece em "Anexar exemplo" nos follow-ups da tela Hoje e na próxima mensagem do painel do lead, que põe "Te mando um exemplo do que fizemos: <link>" no fim do texto. No editor do post, grupos de hashtags salvos entram na legenda com 1 clique (sem repetir as que já estão). A tela Direct (`/direct`) lista quem mandou direct, da conversa mais recente para a mais antiga, com a última mensagem e se ainda dá para responder; "Não é lead" arquiva o lead (sai do funil) e "É lead" traz de volta. **Reels (vídeo):** o navegador lê o vídeo (MP4 ou MOV, de 3 s a 15 min, até 300 MB), tira um quadro como capa e pede um link assinado (`POST /instagram/media/video`); o arquivo vai com PUT direto para o bucket, sem passar pela Vercel (no desenvolvimento, com `STORAGE_LOCAL_DIR`, a própria API recebe em `PUT /instagram/media/:id/upload`). Depois vêm a capa (`POST /instagram/media/:id/poster`) e a confirmação (`POST /instagram/media/:id/complete`, confere o tamanho no bucket). Um Reel tem um vídeo só. Ao publicar, a Meta baixa o vídeo e a capa por links assinados (`media_type=REELS`, `cover_url`, `share_to_feed`) e o publicador espera o processamento (até 4 min) antes do `media_publish`. O bucket precisa aceitar PUT do site no CORS.

**Clientes ativos (F9):** mover o lead para uma etapa do tipo "Fechou" cria a ficha de cliente na mesma transação (uma por lead; mensalidade = valor estimado ou R$ 500; dia de cobrança = dia do fechamento em Fortaleza, até 28). A ficha tem plano, verba diária, observações e o checklist de entrada (acesso de parceiro no Business Manager, WhatsApp Business com saudação, primeira campanha no ar). Relatório semanal: gasto e conversas de uma semana (vale a segunda-feira); o backend calcula o custo por conversa e monta a mensagem-resumo para o cliente, comparando com a semana anterior (copiar ou abrir no WhatsApp). Cobrança: o próximo vencimento é o primeiro mês sem pagamento registrado (o 1º mês vence no início do contrato); registrar o Pix leva ao mês seguinte. A tela Hoje mostra a renovação que vence em até 3 dias (ou atrasada) e o relatório da semana passada que falta, só de clientes ativos. "Adicionar ao banco de provas" transforma os totais do cliente numa prova que a IA pode citar (nome da loja só com autorização). Leads que já estavam em "Fechou" antes da F9 ganharam ficha pausada (sem lembretes até serem ativados).

**Regras:** etapas e pipelines com leads não podem ser apagados (409); as posições de colunas e cards são sempre contíguas (0, 1, 2…) e recalculadas a cada movimento.
O histórico registra sozinho a criação e cada troca de etapa (com o nome das etapas no momento); só anotações podem ser apagadas. Cada lead tem no máximo um próximo contato agendado (`followUpAt`).

## Produção (Vercel)

No ar em **https://leadnexi.vercel.app**: um projeto Vercel (`leadnexi`) com dois serviços, definidos em `vercel.json`: `frontend` (Vite, SPA) e `backend` (NestJS, função Node). `/api/*` vai para o backend e o resto para o frontend, no mesmo domínio (o cookie do refresh token funciona sem CORS). Banco: Postgres no Neon, conectado pela Vercel Marketplace (injeta `DATABASE_URL` e `DATABASE_URL_UNPOOLED`).

- **Deploy:** `vercel deploy --prod` na raiz do repositório.
- **Variáveis na Vercel:** `JWT_SECRET`, `JWT_EXPIRES_IN=15m`, `REFRESH_TOKEN_TTL_DAYS=30` (+ as do Neon). Para a IA: `ANTHROPIC_API_KEY`. Para o Instagram: `CRON_SECRET` e o armazenamento (`STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`). Para a publicação na hora marcada: `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY` (painel da Upstash, plano gratuito). O app da Meta é configurado na tela do Instagram; `INSTAGRAM_*` e `TOKEN_ENCRYPTION_KEY` são opcionais.
- **Cron:** `crons` no `vercel.json` chama `/api/cron/instagram-daily` todo dia às 9h UTC (no plano Hobby a Vercel roda cron no máximo 1x por dia, em algum momento dentro da hora marcada).
- **Migrações:** `DATABASE_URL="<DATABASE_URL_UNPOOLED>" npx prisma migrate deploy` (em `backend/`), antes do deploy que depende delas.
- **Build do backend** (`npm run vercel-build`): `nest build` + `scripts/bundle-vercel.mjs`, que empacota `dist/main.js` num arquivo único com as dependências. Na Vercel o `dist/` vira a raiz da função e o `node_modules` fica fora do alcance do Node; o bundle não depende dele.
- Na Vercel (`VERCEL` definido) o Swagger fica desligado e o Express confia no proxy (IP real para o limite de tentativas). O limite é em memória, por instância da função.

## Testes

```bash
cd backend
npm test            # unitários
npm run test:e2e    # e2e (precisa do banco rodando)
```
