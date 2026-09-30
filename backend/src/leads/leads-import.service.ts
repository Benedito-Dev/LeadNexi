import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImportLeadRowDto, ImportLeadsDto } from './dto/import-leads.dto.js';

/** Origem dos leads importados */
export const IMPORT_SOURCE = 'Planilha';

const MAX_NAME = 120;
const MAX_PHONE = 30;
const MAX_EMAIL = 160;
const MAX_NOTES = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTAGRAM = /^[a-z0-9._]{1,30}$/;

export type ImportRowStatus = 'ready' | 'created' | 'duplicate' | 'invalid';

export interface ImportRowResult {
  /** Posição da linha no pedido (0 = primeira) */
  index: number;
  status: ImportRowStatus;
  /** Por que a linha fica de fora, em português */
  reason?: string;
}

/** Linha conferida e pronta para gravar */
interface CleanRow {
  index: number;
  name: string;
  phone: string | null;
  email: string | null;
  instagramUsername: string | null;
  estimatedValue: number | null;
  notes: string | null;
  stageId: string;
}

/**
 * Importação de leads por planilha. A tela lê o arquivo no navegador, liga as colunas aos campos e
 * manda as linhas; aqui cada linha é conferida (nome, e-mail, @, etapa) e comparada com o CRM e com
 * as outras linhas: quem já existe (mesmo @, telefone ou nome) fica de fora. `dryRun` só diz o que
 * aconteceria (passo "Conferir"); sem ele, grava tudo numa transação, no fim de cada etapa, com
 * origem "Planilha" e "Criado" no histórico.
 */
@Injectable()
export class LeadsImportService {
  private readonly logger = new Logger(LeadsImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async import(dto: ImportLeadsDto) {
    const results: ImportRowResult[] = [];
    const clean: CleanRow[] = [];

    const stages = await this.prisma.stage.findMany({
      where: { id: { in: [...new Set(dto.leads.map((row) => row.stageId))] } },
      select: { id: true, name: true },
    });
    const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));

    for (const [index, row] of dto.leads.entries()) {
      const checked = checkRow(row, index, stageNames);
      if ('status' in checked) results.push(checked);
      else clean.push(checked);
    }

    const duplicates = await this.findDuplicates(clean);
    const accepted = clean.filter((row) => {
      const reason = duplicates.get(row.index);
      if (reason)
        results.push({ index: row.index, status: 'duplicate', reason });
      return !reason;
    });

    if (!dto.dryRun && accepted.length > 0) {
      await this.create(accepted, stageNames);
      this.logger.log(`Planilha: ${accepted.length} lead(s) importado(s)`);
    }
    for (const row of accepted) {
      results.push({
        index: row.index,
        status: dto.dryRun ? 'ready' : 'created',
      });
    }

    results.sort((a, b) => a.index - b.index);
    return {
      /** Entram (dryRun) ou entraram */
      accepted: accepted.length,
      skipped: results.length - accepted.length,
      rows: results,
    };
  }

  /**
   * Quem já está no CRM (mesmo @, telefone ou nome) e quem aparece duas vezes na planilha (a
   * segunda fica de fora). Uma consulta só ao banco.
   */
  private async findDuplicates(rows: CleanRow[]) {
    const names = unique(rows.map((row) => nameKey(row.name)));
    const users = unique(rows.flatMap((row) => row.instagramUsername ?? []));
    const phones = unique(rows.flatMap((row) => phoneKey(row.phone) ?? []));

    const existing = await this.prisma.$queryRaw<
      {
        name: string;
        phone: string | null;
        instagram_username: string | null;
      }[]
    >`
      SELECT name, phone, instagram_username FROM leads
      WHERE lower(trim(name)) = ANY(${names})
         OR instagram_username = ANY(${users})
         OR regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^55(\\d{10,11})$', '\\1') = ANY(${phones})
    `;
    const inCrm = {
      names: new Set(existing.map((lead) => nameKey(lead.name))),
      users: new Set(existing.flatMap((lead) => lead.instagram_username ?? [])),
      phones: new Set(existing.flatMap((lead) => phoneKey(lead.phone) ?? [])),
    };

    const reasons = new Map<number, string>();
    const seen = new Map<string, number>();
    for (const row of rows) {
      const keys = [
        row.instagramUsername && `@:${row.instagramUsername}`,
        phoneKey(row.phone) && `tel:${phoneKey(row.phone)}`,
        `nome:${nameKey(row.name)}`,
      ].filter((key): key is string => Boolean(key));

      if (row.instagramUsername && inCrm.users.has(row.instagramUsername)) {
        reasons.set(row.index, 'Já está no CRM (mesmo @ do Instagram)');
      } else if (
        phoneKey(row.phone) &&
        inCrm.phones.has(phoneKey(row.phone)!)
      ) {
        reasons.set(row.index, 'Já está no CRM (mesmo telefone)');
      } else if (inCrm.names.has(nameKey(row.name))) {
        reasons.set(row.index, 'Já está no CRM (mesmo nome)');
      } else {
        const first = keys
          .map((key) => seen.get(key))
          .find((at) => at !== undefined);
        if (first !== undefined) {
          reasons.set(
            row.index,
            `Repetido na planilha (igual à linha ${first + 1} do envio)`,
          );
        }
      }
      for (const key of keys) if (!seen.has(key)) seen.set(key, row.index);
    }
    return reasons;
  }

  /** Grava tudo junto: leads no fim de cada etapa, na ordem da planilha, e "Criado" no histórico. */
  private async create(rows: CleanRow[], stageNames: Map<string, string>) {
    await this.prisma.$transaction(async (tx) => {
      const counts = await tx.lead.groupBy({
        by: ['stageId'],
        where: {
          stageId: { in: [...new Set(rows.map((row) => row.stageId))] },
        },
        _count: { _all: true },
      });
      const nextPosition = new Map(
        counts.map((count) => [count.stageId, count._count._all]),
      );

      const leads = rows.map((row) => {
        const position = nextPosition.get(row.stageId) ?? 0;
        nextPosition.set(row.stageId, position + 1);
        return {
          id: randomUUID(),
          name: row.name,
          phone: row.phone,
          email: row.email,
          instagramUsername: row.instagramUsername,
          estimatedValue: row.estimatedValue,
          notes: row.notes,
          source: IMPORT_SOURCE,
          stageId: row.stageId,
          position,
        };
      });
      await tx.lead.createMany({ data: leads });
      await tx.leadActivity.createMany({
        data: leads.map((lead) => ({
          leadId: lead.id,
          type: 'CREATED' as const,
          text: IMPORT_SOURCE,
          toStage: stageNames.get(lead.stageId) ?? null,
        })),
      });
    });
  }
}

/** Confere e limpa uma linha. Com problema, devolve o motivo (a linha fica de fora). */
function checkRow(
  row: ImportLeadRowDto,
  index: number,
  stageNames: Map<string, string>,
): CleanRow | ImportRowResult {
  const invalid = (reason: string): ImportRowResult => ({
    index,
    status: 'invalid',
    reason,
  });

  const name = row.name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  if (!name) return invalid('Sem nome');

  const phone = row.phone?.trim() || null;
  if (phone && phone.length > MAX_PHONE)
    return invalid('Telefone longo demais');

  const email = row.email?.trim().toLowerCase() || null;
  if (email && (email.length > MAX_EMAIL || !EMAIL.test(email))) {
    return invalid('E-mail inválido');
  }

  const instagramUsername = instagramHandle(row.instagramUsername);
  if (instagramUsername && !INSTAGRAM.test(instagramUsername)) {
    return invalid('@ do Instagram inválido');
  }

  if (!stageNames.has(row.stageId)) return invalid('Etapa não encontrada');

  return {
    index,
    name,
    phone,
    email,
    instagramUsername,
    estimatedValue:
      row.estimatedValue === undefined
        ? null
        : Math.round(row.estimatedValue * 100) / 100,
    notes: row.notes?.trim().slice(0, MAX_NOTES) || null,
    stageId: row.stageId,
  };
}

/** "@maria", "maria" ou "https://instagram.com/maria/" → "maria" */
export function instagramHandle(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const fromUrl = /instagram\.com\/([^/?#\s]+)/i.exec(text)?.[1];
  return (fromUrl ?? text).replace(/^@/, '').toLowerCase() || null;
}

function nameKey(name: string) {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Só os dígitos, sem o 55 do Brasil (para "+55 85 9..." e "85 9..." serem o mesmo número) */
export function phoneKey(phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (digits.length < 8) return null;
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
