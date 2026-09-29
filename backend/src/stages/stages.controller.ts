import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateStageDto } from './dto/create-stage.dto.js';
import { ReorderStagesDto } from './dto/reorder-stages.dto.js';
import { UpdateStageDto } from './dto/update-stage.dto.js';
import { StageEntity } from './entities/stage.entity.js';
import { StagesService } from './stages.service.js';

@ApiTags('Stages')
@ApiBearerAuth()
@Controller()
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Post('pipelines/:pipelineId/stages')
  @ApiOperation({ summary: 'Cria uma etapa no fim do pipeline' })
  @ApiCreatedResponse({ type: StageEntity })
  @ApiNotFoundResponse({ description: 'Pipeline não encontrado' })
  create(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.stagesService.create(pipelineId, dto);
  }

  @Patch('pipelines/:pipelineId/stages/reorder')
  @ApiOperation({ summary: 'Reordena as etapas (arrastar colunas)' })
  @ApiOkResponse({ type: [StageEntity] })
  @ApiBadRequestResponse({
    description: 'A lista não contém exatamente as etapas do pipeline',
  })
  @ApiNotFoundResponse({ description: 'Pipeline não encontrado' })
  reorder(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.stagesService.reorder(pipelineId, dto);
  }

  @Patch('stages/:id')
  @ApiOperation({ summary: 'Atualiza nome ou cor da etapa' })
  @ApiOkResponse({ type: StageEntity })
  @ApiNotFoundResponse({ description: 'Etapa não encontrada' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStageDto) {
    return this.stagesService.update(id, dto);
  }

  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a etapa (precisa estar sem leads)' })
  @ApiNoContentResponse({ description: 'Etapa removida' })
  @ApiNotFoundResponse({ description: 'Etapa não encontrada' })
  @ApiConflictResponse({ description: 'A etapa ainda possui leads' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.stagesService.remove(id);
  }
}
