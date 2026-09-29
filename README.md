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
│       ├── health/        # health check público
│       ├── common/        # filtro de erros do Prisma, utilitários de posição
│       ├── prisma/        # PrismaService (global)
│       └── generated/     # Prisma Client (gerado, fora do git)
└── frontend/              # React + Vite + Tailwind v4
    ├── public/brand/      # SVGs da marca (símbolo, logo, favicon, ícones de app)
    └── src/
        ├── brand/         # tokens.css, tema do Tailwind e <LeadNexiMark>/<LeadNexiLogo>
        ├── app/           # App, providers e rotas
        ├── pages/         # telas (Login, Hoje, Kanban, Leads)
        ├── features/      # auth, leads, pipelines (tipos, chamadas à API, hooks)
        ├── components/    # componentes compartilhados
        └── lib/           # cliente HTTP
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

## API

Todas as rotas ficam sob `/api` e exigem `Authorization: Bearer <token>`, exceto login, refresh, logout e `GET /health`.

**Sessão:** o login devolve um access token (JWT de 15 min, guardado só em memória no frontend) e grava o refresh token (30 dias) num cookie `lnx_refresh` httpOnly, `SameSite=Strict`, restrito a `/api/auth`. `POST /auth/refresh` troca o refresh por um novo a cada uso (rotação) e devolve outro access token; reapresentar um refresh já trocado encerra a sessão inteira (sinal de roubo). `POST /auth/logout` revoga a sessão no servidor. O login aceita 5 tentativas por minuto por IP. Senhas com scrypt. Em produção (`NODE_ENV=production`) o cookie sai com `Secure`.
A documentação completa (com "Try it out") está em **http://localhost:3000/api/docs**.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Pipelines | `GET /pipelines` · `GET /pipelines/:id` (Kanban completo) · `POST` · `PATCH /:id` · `DELETE /:id` |
| Stages | `POST /pipelines/:id/stages` · `PATCH /pipelines/:id/stages/reorder` · `PATCH /stages/:id` · `DELETE /stages/:id` |
| Leads | `GET /leads?search&pipelineId&stageId&source&page&limit` · `GET /leads/:id` · `POST` · `PATCH /:id` · `PATCH /:id/move` · `DELETE /:id` |
| Histórico do lead | `GET /leads/follow-ups` (agenda, atrasados primeiro) · `GET /leads/:id/activities` · `POST /leads/:id/notes` · `DELETE /leads/:id/notes/:activityId` · `PUT /leads/:id/follow-up` · `POST /leads/:id/follow-up/complete` · `DELETE /leads/:id/follow-up` |

**Regras:** etapas e pipelines com leads não podem ser apagados (409); as posições de colunas e cards são sempre contíguas (0, 1, 2…) e recalculadas a cada movimento.
O histórico registra sozinho a criação e cada troca de etapa (com o nome das etapas no momento); só anotações podem ser apagadas. Cada lead tem no máximo um próximo contato agendado (`followUpAt`).

## Testes

```bash
cd backend
npm test            # unitários
npm run test:e2e    # e2e (precisa do banco rodando)
```
