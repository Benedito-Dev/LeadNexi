# LeadNexi

CRM pessoal: gestão de leads, pipelines Kanban customizáveis e, futuramente, WhatsApp e agendamento de posts no Instagram.

## Estrutura

```
LeadNexi/
├── docker-compose.yml     # Postgres local (porta 5435)
├── backend/               # NestJS + Prisma 7
│   ├── prisma/            # schema.prisma e migrations
│   └── src/
│       ├── auth/          # login (usuário único)
│       ├── leads/         # CRUD de leads
│       ├── pipelines/     # pipelines e etapas do Kanban
│       ├── prisma/        # PrismaService (global)
│       └── generated/     # Prisma Client (gerado, fora do git)
└── frontend/              # React + Vite
    └── src/
        ├── app/           # App, providers e rotas
        ├── pages/         # telas (Login, Kanban, Leads)
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
npm run start:dev          # http://localhost:3000/api

cd ../frontend
npm install
npm run dev                # http://localhost:5173
```
