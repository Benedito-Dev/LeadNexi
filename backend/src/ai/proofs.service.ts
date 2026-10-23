import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProofDto, UpdateProofDto } from './dto/proof.dto.js';

/** Banco de provas (spec 4.6): os únicos resultados que a IA pode citar. */
@Injectable()
export class ProofsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.proof.findMany({ orderBy: { createdAt: 'asc' } });
  }

  create(dto: CreateProofDto) {
    return this.prisma.proof.create({ data: dto });
  }

  async update(id: string, dto: UpdateProofDto) {
    await this.findOrFail(id);
    return this.prisma.proof.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    await this.prisma.proof.delete({ where: { id } });
  }

  private async findOrFail(id: string) {
    const proof = await this.prisma.proof.findUnique({ where: { id }, select: { id: true } });
    if (!proof) throw new NotFoundException('Prova não encontrada');
    return proof;
  }
}
