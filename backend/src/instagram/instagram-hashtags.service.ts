import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HASHTAG_LIMIT } from './dto/create-instagram-post.dto.js';
import { CreateHashtagSetDto } from './dto/hashtag-set.dto.js';

/**
 * "#celular #Fortaleza celular, #celular" → "#celular #Fortaleza": só as hashtags, sem repetir
 * (sem diferenciar maiúsculas), na ordem em que apareceram. Palavra sem # ganha o #.
 */
export function normalizeHashtags(input: string): string {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(/[\s,;]+/)) {
    const word = raw.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (!word || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    tags.push(`#${word}`);
  }
  return tags.join(' ');
}

/** Grupos de hashtags salvos, para inserir na legenda com 1 clique (spec F8). */
@Injectable()
export class InstagramHashtagsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.instagramHashtagSet.findMany({ orderBy: { name: 'asc' } });
  }

  create({ name, tags }: CreateHashtagSetDto) {
    const normalized = normalizeHashtags(tags);
    if (!normalized) throw new BadRequestException('Escreva pelo menos uma hashtag.');
    if (normalized.split(' ').length > HASHTAG_LIMIT) {
      throw new BadRequestException(`Use no máximo ${HASHTAG_LIMIT} hashtags.`);
    }
    return this.prisma.instagramHashtagSet.create({ data: { name: name.trim(), tags: normalized } });
  }

  async remove(id: string) {
    const { count } = await this.prisma.instagramHashtagSet.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException('Grupo de hashtags não encontrado');
  }
}
