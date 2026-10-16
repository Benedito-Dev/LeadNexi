import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLeadListDto } from './dto/create-lead-list.dto.js';
import { UpdateLeadListDto } from './dto/update-lead-list.dto.js';

export const DEFAULT_LIST_NAME = 'Sem lista';

@Injectable()
export class LeadListsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const lists = await this.prisma.leadList.findMany({
      orderBy: [{ archived: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { leads: { where: { archived: false } } } },
      },
    });
    return lists.map(({ _count, ...list }) => ({ ...list, leadCount: _count.leads }));
  }

  async create(dto: CreateLeadListDto) {
    const list = await this.prisma.leadList.create({ data: { name: dto.name.trim(), ...cleanListData(dto) } });
    return { ...list, leadCount: 0 };
  }

  async update(id: string, dto: UpdateLeadListDto) {
    await this.findOrFail(id);
    const list = await this.prisma.leadList.update({
      where: { id },
      data: cleanListData(dto),
    });
    const leadCount = await this.prisma.lead.count({ where: { listId: id, archived: false } });
    return { ...list, leadCount };
  }

  async findOrFail(id: string) {
    const list = await this.prisma.leadList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('Lista não encontrada');
    return list;
  }

  async defaultList() {
    const current = await this.prisma.leadList.findFirst({
      where: { name: DEFAULT_LIST_NAME, archived: false },
      orderBy: { createdAt: 'asc' },
    });
    if (current) return current;
    return this.prisma.leadList.create({ data: { name: DEFAULT_LIST_NAME } });
  }
}

function cleanListData(dto: Partial<CreateLeadListDto> & UpdateLeadListDto) {
  return {
    ...(dto.name !== undefined && { name: dto.name.trim() }),
    ...(dto.niche !== undefined && { niche: dto.niche?.trim() || null }),
    ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
    ...(dto.targetContacts !== undefined && { targetContacts: dto.targetContacts }),
    ...('archived' in dto && dto.archived !== undefined && { archived: dto.archived }),
  };
}
