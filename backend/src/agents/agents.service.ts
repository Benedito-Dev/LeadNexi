import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FinishAgentRunDto } from './dto/agent-run.dto.js';

/** Execução aberta há mais que isso parou sem avisar (a VPS caiu, o Claude Code travou). */
const STALE_RUN_MS = 2 * 60 * 60 * 1000;
/** Fortaleza é UTC-3 o ano todo (sem horário de verão). */
const FORTALEZA_OFFSET_MS = -3 * 60 * 60 * 1000;

const runView = { id: true, status: true, summary: true, startedAt: true, finishedAt: true } as const;

/**
 * Escritório Virtual: os agentes da VPS e as execuções deles. Os agentes avisam quando acordam
 * (start) e quando terminam (finish); a tela mostra a situação de cada um.
 */
@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(now = new Date()) {
    const agents = await this.prisma.agent.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
      include: { runs: { orderBy: { startedAt: 'desc' }, take: 1, select: runView } },
    });
    return agents.map(({ runs, ...agent }) => {
      const last = runs[0] ?? null;
      return {
        ...agent,
        lastRun: last && { ...last, status: runStatus(last, now) },
        nextRunAt: agent.scheduleTime ? nextRunAt(agent.scheduleTime, now) : null,
      };
    });
  }

  async runs(agentId: string, now = new Date()) {
    const found = await this.prisma.agent.findUnique({ where: { id: agentId }, select: { id: true } });
    if (!found) throw new NotFoundException('Agente não encontrado');
    const runs = await this.prisma.agentRun.findMany({
      where: { agentId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: runView,
    });
    return runs.map((run) => ({ ...run, status: runStatus(run, now) }));
  }

  /** O agente acordou: abre uma execução. */
  async start(slug: string) {
    const agent = await this.prisma.agent.findUnique({ where: { slug: slug.trim().toLowerCase() }, select: { id: true, active: true } });
    if (!agent) throw new NotFoundException(`Agente "${slug}" não existe no LeadNexi.`);
    if (!agent.active) throw new BadRequestException(`O agente "${slug}" está desligado.`);
    return this.prisma.agentRun.create({ data: { agentId: agent.id }, select: runView });
  }

  /** O agente terminou: fecha a execução com o resultado. */
  async finish(runId: string, { status, summary }: FinishAgentRunDto) {
    const run = await this.prisma.agentRun.findUnique({ where: { id: runId }, select: { finishedAt: true } });
    if (!run) throw new NotFoundException('Execução não encontrada');
    if (run.finishedAt) throw new BadRequestException('Esta execução já terminou.');
    return this.prisma.agentRun.update({
      where: { id: runId },
      data: { status, summary: summary?.trim() || null, finishedAt: new Date() },
      select: runView,
    });
  }
}

/** Execução aberta há horas vira "falhou" na tela (o banco guarda como está). */
export function runStatus(run: { status: string; startedAt: Date }, now: Date) {
  return run.status === 'RUNNING' && now.getTime() - run.startedAt.getTime() > STALE_RUN_MS ? 'STALE' : run.status;
}

/** Próxima vez que "HH:MM" (Fortaleza) acontece a partir de agora. */
export function nextRunAt(scheduleTime: string, now: Date) {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const local = new Date(now.getTime() + FORTALEZA_OFFSET_MS);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hours, minutes) - FORTALEZA_OFFSET_MS;
  return new Date(today > now.getTime() ? today : today + 24 * 60 * 60 * 1000);
}
