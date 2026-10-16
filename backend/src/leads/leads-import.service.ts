import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LeadListsService } from '../lead-lists/lead-lists.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImportLeadRowDto, ImportLeadsDto } from './dto/import-leads.dto.js';

export const IMPORT_SOURCE = 'Planilha';

const MAX_NAME = 120;
const MAX_PHONE = 30;
const MAX_EMAIL = 160;
const MAX_NOTES = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTAGRAM = /^[a-z0-9._]{1,30}$/;

export type ImportRowStatus = 'ready' | 'created' | 'updated' | 'duplicate' | 'invalid';

export interface ImportRowResult {
  index: number;
  status: ImportRowStatus;
  reason?: string;
}

interface CleanRow {
  index: number;
  name: string;
  phone: string | null;
  phoneType: string | null;
  email: string | null;
  instagramUsername: string | null;
  estimatedValue: number | null;
  notes: string | null;
  listId: string;
  neighborhood: string | null;
  address: string | null;
  mapsUrl: string | null;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  isNetwork: boolean;
  adStatus: string | null;
  cadenceStep: number | null;
  followUpAt?: Date;
  stageId: string;
}

interface DuplicateMatch {
  reason: string;
  leadId?: string;
}

@Injectable()
export class LeadsImportService {
  private readonly logger = new Logger(LeadsImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadLists: LeadListsService,
  ) {}

  async import(dto: ImportLeadsDto) {
    const resultByIndex = new Map<number, ImportRowResult>();
    const clean: CleanRow[] = [];
    const stages = await this.prisma.stage.findMany({
      where: { id: { in: [...new Set(dto.leads.map((row) => row.stageId))] } },
      select: { id: true, name: true },
    });
    const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));
    const defaultList = dto.listId ? await this.leadLists.findOrFail(dto.listId) : await this.leadLists.defaultList();
    const listIds = new Set(
      (
        await this.prisma.leadList.findMany({
          where: { id: { in: [...new Set(dto.leads.map((row) => row.listId).filter(Boolean) as string[])] } },
          select: { id: true },
        })
      ).map((list) => list.id),
    );
    listIds.add(defaultList.id);

    for (const [index, row] of dto.leads.entries()) {
      const checked = checkRow(row, index, stageNames, listIds, row.listId ?? dto.listId ?? defaultList.id);
      if ('status' in checked) resultByIndex.set(index, checked);
      else clean.push(checked);
    }

    const duplicates = await this.findDuplicates(clean);
    const mode = dto.duplicateMode ?? 'skip';
    const actionable = clean.filter((row) => {
      const match = duplicates.get(row.index);
      if (!match) return true;
      resultByIndex.set(row.index, { index: row.index, status: 'duplicate', reason: match.reason });
      return mode === 'duplicate' || (mode === 'update' && Boolean(match.leadId));
    });

    if (!dto.dryRun && actionable.length > 0) {
      const updateRows = mode === 'update' ? actionable.filter((row) => duplicates.get(row.index)?.leadId) : [];
      const createRows = mode === 'duplicate' ? actionable : actionable.filter((row) => !duplicates.has(row.index));
      if (updateRows.length > 0) await this.updateExisting(updateRows, duplicates, stageNames);
      if (createRows.length > 0) await this.create(createRows, stageNames);
      for (const row of updateRows) {
        resultByIndex.set(row.index, { index: row.index, status: 'updated' });
      }
      for (const row of createRows) {
        resultByIndex.set(row.index, { index: row.index, status: 'created' });
      }
      this.logger.log(`Planilha: ${createRows.length} criado(s), ${updateRows.length} atualizado(s)`);
    } else if (dto.dryRun) {
      for (const row of actionable) {
        if (!resultByIndex.has(row.index)) resultByIndex.set(row.index, { index: row.index, status: 'ready' });
      }
    }

    const rows = [...resultByIndex.values()].sort((a, b) => a.index - b.index);
    const accepted = actionable.length;
    return {
      accepted,
      skipped: rows.length - accepted,
      rows,
    };
  }

  private async findDuplicates(rows: CleanRow[]) {
    if (rows.length === 0) return new Map<number, DuplicateMatch>();
    const names = unique(rows.map((row) => row.name.trim().toLowerCase()));
    const users = unique(rows.flatMap((row) => (row.instagramUsername ? [row.instagramUsername] : [])));
    const phones = unique(rows.flatMap((row) => (phoneKey(row.phone) ? [phoneKey(row.phone)!] : [])));
    const existing = await this.prisma.$queryRaw<
      { id: string; name: string; phone: string | null; instagram_username: string | null }[]
    >`
      SELECT id, name, phone, instagram_username FROM leads
      WHERE lower(trim(name)) = ANY(${names})
         OR instagram_username = ANY(${users})
         OR regexp_replace(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), '^55(\\d{10,11})$', '\\1') = ANY(${phones})
    `;
    const byName = new Map(existing.map((lead) => [nameKey(lead.name), lead]));
    const byUser = new Map(existing.filter((lead) => lead.instagram_username).map((lead) => [lead.instagram_username!, lead]));
    const byPhone = new Map(existing.flatMap((lead) => (phoneKey(lead.phone) ? [[phoneKey(lead.phone)!, lead] as const] : [])));
    const reasons = new Map<number, DuplicateMatch>();
    const seen = new Map<string, number>();

    for (const row of rows) {
      const userMatch = row.instagramUsername ? byUser.get(row.instagramUsername) : undefined;
      const phoneMatch = row.phone ? byPhone.get(phoneKey(row.phone) ?? '') : undefined;
      const nameMatch = byName.get(nameKey(row.name));
      const keys = [
        row.instagramUsername && `@:${row.instagramUsername}`,
        phoneKey(row.phone) && `tel:${phoneKey(row.phone)}`,
        `nome:${nameKey(row.name)}`,
      ].filter((key): key is string => Boolean(key));
      if (userMatch) reasons.set(row.index, { leadId: userMatch.id, reason: 'Já está no CRM (mesmo @ do Instagram)' });
      else if (phoneMatch) reasons.set(row.index, { leadId: phoneMatch.id, reason: 'Já está no CRM (mesmo telefone)' });
      else if (nameMatch) reasons.set(row.index, { leadId: nameMatch.id, reason: 'Já está no CRM (mesmo nome)' });
      else {
        const first = keys.map((key) => seen.get(key)).find((at) => at !== undefined);
        if (first !== undefined) reasons.set(row.index, { reason: `Repetido na planilha (igual à linha ${first + 1} do envio)` });
      }
      for (const key of keys) if (!seen.has(key)) seen.set(key, row.index);
    }
    return reasons;
  }

  private async create(rows: CleanRow[], stageNames: Map<string, string>) {
    await this.prisma.$transaction(async (tx) => {
      const counts = await tx.lead.groupBy({
        by: ['stageId'],
        where: { stageId: { in: [...new Set(rows.map((row) => row.stageId))] }, archived: false },
        _count: { _all: true },
      });
      const nextPosition = new Map(counts.map((count) => [count.stageId, count._count._all]));
      const leads = rows.map((row) => {
        const position = nextPosition.get(row.stageId) ?? 0;
        nextPosition.set(row.stageId, position + 1);
        return { id: randomUUID(), ...leadData(row), position, source: IMPORT_SOURCE, stageId: row.stageId };
      });
      await tx.lead.createMany({ data: leads });
      await tx.leadActivity.createMany({
        data: leads.map((lead) => ({ leadId: lead.id, type: 'CREATED' as const, text: IMPORT_SOURCE, toStage: stageNames.get(lead.stageId) ?? null })),
      });
    });
  }

  private async updateExisting(rows: CleanRow[], matches: Map<number, DuplicateMatch>, stageNames: Map<string, string>) {
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const id = matches.get(row.index)?.leadId;
        if (!id) continue;
        const current = await tx.lead.findUnique({ where: { id }, include: { stage: true } });
        if (!current) continue;
        const stageChanged = current.stageId !== row.stageId;
        const position = stageChanged
          ? await tx.lead.count({ where: { stageId: row.stageId, archived: false } })
          : current.position;
        await tx.lead.update({ where: { id }, data: { ...leadData(row), stageId: row.stageId, position } });
        if (stageChanged) {
          await tx.leadActivity.create({ data: { leadId: id, type: 'STAGE_CHANGED', fromStage: current.stage.name, toStage: stageNames.get(row.stageId) ?? null } });
        }
      }
    });
  }
}

function checkRow(row: ImportLeadRowDto, index: number, stageNames: Map<string, string>, listIds: Set<string>, fallbackListId: string): CleanRow | ImportRowResult {
  const invalid = (reason: string): ImportRowResult => ({ index, status: 'invalid', reason });
  const name = row.name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  if (!name) return invalid('Sem nome');
  const phone = row.phone?.trim() ? normalizePhone(row.phone) : null;
  if (row.phone?.trim() && !phone) return invalid('Telefone inválido; use DDD e número brasileiro');
  if (row.phone?.trim() && row.phone.trim().length > MAX_PHONE) return invalid('Telefone longo demais');
  const email = row.email?.trim().toLowerCase() || null;
  if (email && (email.length > MAX_EMAIL || !EMAIL.test(email))) return invalid('E-mail inválido');
  const instagramUsername = instagramHandle(row.instagramUsername);
  if (instagramUsername && !INSTAGRAM.test(instagramUsername)) return invalid('@ do Instagram inválido');
  if (!stageNames.has(row.stageId)) return invalid('Etapa não encontrada');
  const listId = row.listId ?? fallbackListId;
  if (!listIds.has(listId)) return invalid('Lista não encontrada');
  const followUpAt = row.followUpAt ? new Date(row.followUpAt) : undefined;
  if (followUpAt && Number.isNaN(followUpAt.getTime())) return invalid('Data do próximo contato inválida');
  return {
    index,
    name,
    phone,
    phoneType: normalizePhoneType(row.phoneType) ?? inferPhoneType(phone),
    email,
    instagramUsername,
    estimatedValue: row.estimatedValue === undefined ? null : Math.round(row.estimatedValue * 100) / 100,
    notes: row.notes?.trim().slice(0, MAX_NOTES) || null,
    listId,
    neighborhood: row.neighborhood?.trim() || null,
    address: row.address?.trim() || null,
    mapsUrl: row.mapsUrl?.trim() || null,
    googlePlaceId: row.googlePlaceId?.trim() || null,
    googleRating: row.googleRating ?? null,
    googleReviewCount: row.googleReviewCount ?? null,
    isNetwork: row.isNetwork ?? false,
    adStatus: normalizeAdStatus(row.adStatus),
    cadenceStep: row.cadenceStep ?? null,
    ...(followUpAt ? { followUpAt } : {}),
    stageId: row.stageId,
  };
}

function leadData(row: CleanRow) {
  return {
    name: row.name,
    phone: row.phone,
    phoneType: row.phoneType,
    email: row.email,
    instagramUsername: row.instagramUsername,
    estimatedValue: row.estimatedValue,
    notes: row.notes,
    listId: row.listId,
    neighborhood: row.neighborhood,
    address: row.address,
    mapsUrl: row.mapsUrl,
    googlePlaceId: row.googlePlaceId,
    googleRating: row.googleRating,
    googleReviewCount: row.googleReviewCount,
    isNetwork: row.isNetwork,
    adStatus: row.adStatus,
    cadenceStep: row.cadenceStep,
    ...(row.followUpAt ? { followUpAt: row.followUpAt } : {}),
  };
}

export function instagramHandle(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const fromUrl = /instagram\.com\/([^/?#\s]+)/i.exec(text)?.[1];
  return (fromUrl ?? text).replace(/^@/, '').toLowerCase() || null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (/^55\d{10,11}$/.test(digits)) return `+${digits}`;
  if (/^\d{10,11}$/.test(digits)) return `+55${digits}`;
  return null;
}

export function phoneKey(phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (digits.length < 8) return null;
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
}

function inferPhoneType(phone: string | null) {
  if (!phone) return null;
  const national = phone.replace(/\D/g, '').replace(/^55/, '');
  return national.length === 11 && national[2] === '9' ? 'celular' : 'fixo';
}

function normalizePhoneType(value: string | undefined) {
  const key = value?.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  if (!key) return null;
  if (key.includes('fix')) return 'fixo';
  if (key.includes('cel') || key.includes('mob')) return 'celular';
  return 'desconhecido';
}

function normalizeAdStatus(value: string | undefined) {
  const key = value?.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  if (!key) return null;
  if (['sim', 'anuncia', 'ativo', 'yes', 'true'].includes(key)) return 'anuncia';
  if (['nao', 'não', 'nao_verificado', 'não verificado', 'unknown'].includes(key)) return key.includes('verif') ? 'nao_verificado' : 'nao';
  return 'nao_verificado';
}

function nameKey(name: string) {
  return name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values)];
}
