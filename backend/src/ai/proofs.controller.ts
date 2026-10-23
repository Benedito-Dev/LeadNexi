import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProofDto, UpdateProofDto } from './dto/proof.dto.js';
import { ProofsService } from './proofs.service.js';

@ApiTags('IA')
@ApiBearerAuth()
@Controller('proofs')
export class ProofsController {
  constructor(private readonly proofs: ProofsService) {}

  @Get()
  @ApiOperation({ summary: 'Banco de provas: resultados reais que a IA pode citar' })
  @ApiOkResponse({ description: 'Lista de provas, da mais antiga para a mais nova' })
  findAll() {
    return this.proofs.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Adiciona uma prova' })
  @ApiCreatedResponse({ description: 'Prova criada' })
  create(@Body() dto: CreateProofDto) {
    return this.proofs.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita, liga ou desliga uma prova' })
  @ApiOkResponse({ description: 'Prova atualizada' })
  @ApiNotFoundResponse({ description: 'Prova não encontrada' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProofDto) {
    return this.proofs.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma prova' })
  @ApiNoContentResponse({ description: 'Prova removida' })
  @ApiNotFoundResponse({ description: 'Prova não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.proofs.remove(id);
  }
}
