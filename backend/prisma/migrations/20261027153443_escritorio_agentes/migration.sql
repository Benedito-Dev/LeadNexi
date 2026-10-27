-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "schedule_time" TEXT,
    "character" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'RUNNING',
    "summary" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_slug_key" ON "agents"("slug");

-- CreateIndex
CREATE INDEX "agent_runs_agent_id_started_at_idx" ON "agent_runs"("agent_id", "started_at");

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Os três agentes da primeira leva (docs/produto/MAPA.md, seção 6)
INSERT INTO "agents" ("id", "slug", "name", "role", "schedule_time", "character", "position") VALUES
  (gen_random_uuid(), 'criador', 'Criador', 'Faz 2 vídeos e 2 carrosséis e salva como rascunho em Conteúdo', '04:00', 'criador', 0),
  (gen_random_uuid(), 'estrategista', 'Estrategista', 'Escolhe o melhor vídeo e o melhor carrossel, define o horário e agenda', '06:00', 'estrategista', 1),
  (gen_random_uuid(), 'prospector', 'Prospector', 'Prepara a 1ª mensagem dos 10 próximos leads da lista', NULL, 'prospector', 2);
