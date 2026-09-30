import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { StorageService } from '../storage/storage.service.js';
import { avatarKey } from './lead-avatar.js';

/**
 * Foto de perfil do lead (cópia da foto do Instagram). Pública como a própria foto no Instagram:
 * o endereço tem um ID aleatório que muda a cada foto nova, então pode ficar em cache para sempre.
 */
@ApiExcludeController()
@Public()
@Controller('leads/avatars')
export class LeadAvatarsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  async avatar(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const stream = await this.storage.get(avatarKey(id));
      return new StreamableFile(stream, { type: 'image/jpeg' });
    } catch {
      throw new NotFoundException('Foto não encontrada');
    }
  }
}
