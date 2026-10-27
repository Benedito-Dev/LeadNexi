import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AgentsService, nextRunAt, runStatus } from './agents.service.js';

describe('Escritório › horários e situação', () => {
  it('próxima execução no horário de Fortaleza (UTC-3): hoje se ainda não passou, senão amanhã', () => {
    // 27/10 às 03:00 em Fortaleza = 06:00 UTC
    expect(nextRunAt('04:00', new Date('2026-10-27T06:00:00Z')).toISOString()).toBe('2026-10-27T07:00:00.000Z');
    // 27/10 às 10:00 em Fortaleza: o das 04:00 já passou, vai para 28/10
    expect(nextRunAt('04:00', new Date('2026-10-27T13:00:00Z')).toISOString()).toBe('2026-10-28T07:00:00.000Z');
    // 23:30 em Fortaleza (02:30 UTC do dia seguinte): o das 06:00 é no dia seguinte em Fortaleza
    expect(nextRunAt('06:00', new Date('2026-10-28T02:30:00Z')).toISOString()).toBe('2026-10-28T09:00:00.000Z');
  });

  it('execução aberta há mais de 2 horas parou sem avisar', () => {
    const agora = new Date('2026-10-27T10:00:00Z');
    expect(runStatus({ status: 'RUNNING', startedAt: new Date('2026-10-27T09:30:00Z') }, agora)).toBe('RUNNING');
    expect(runStatus({ status: 'RUNNING', startedAt: new Date('2026-10-27T07:00:00Z') }, agora)).toBe('STALE');
    expect(runStatus({ status: 'SUCCEEDED', startedAt: new Date('2026-10-27T07:00:00Z') }, agora)).toBe('SUCCEEDED');
  });
});

describe('AgentsService › avisos dos agentes', () => {
  function setup(agent: { id: string; active: boolean } | null, run: { finishedAt: Date | null } | null = null) {
    const prisma = {
      agent: { findUnique: vi.fn().mockResolvedValue(agent) },
      agentRun: {
        findUnique: vi.fn().mockResolvedValue(run),
        create: vi.fn().mockResolvedValue({ id: 'run-1', status: 'RUNNING' }),
        update: vi.fn().mockResolvedValue({ id: 'run-1', status: 'SUCCEEDED' }),
      },
    };
    return { prisma, service: new AgentsService(prisma as unknown as PrismaService) };
  }

  it('abre a execução pelo slug (sem ligar para caixa) e recusa agente desconhecido ou desligado', async () => {
    const { service, prisma } = setup({ id: 'ag-1', active: true });
    await service.start(' Criador ');
    expect(prisma.agent.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'criador' } }));
    expect(prisma.agentRun.create).toHaveBeenCalledWith(expect.objectContaining({ data: { agentId: 'ag-1' } }));

    await expect(setup(null).service.start('fantasma')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ id: 'ag-1', active: false }).service.start('criador')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fecha a execução uma vez só, com o resumo', async () => {
    const { service, prisma } = setup(null, { finishedAt: null });
    await service.finish('run-1', { status: 'SUCCEEDED', summary: '  2 vídeos e 2 carrosséis em Conteúdo  ' });
    expect(prisma.agentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCEEDED', summary: '2 vídeos e 2 carrosséis em Conteúdo' }) }),
    );
    await expect(setup(null, { finishedAt: new Date() }).service.finish('run-1', { status: 'FAILED' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
