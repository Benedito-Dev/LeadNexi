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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePipelineDto } from './dto/create-pipeline.dto.js';
import { UpdatePipelineDto } from './dto/update-pipeline.dto.js';
import {
  PipelineBoardEntity,
  PipelineEntity,
  PipelineSummaryEntity,
} from './entities/pipeline.entity.js';
import { PipelinesService } from './pipelines.service.js';

@ApiTags('Pipelines')
@ApiBearerAuth()
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os pipelines com suas etapas' })
  @ApiOkResponse({ type: [PipelineSummaryEntity] })
  findAll() {
    return this.pipelinesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retorna o pipeline completo (etapas + leads) para o Kanban',
  })
  @ApiOkResponse({ type: PipelineBoardEntity })
  @ApiNotFoundResponse({ description: 'Pipeline não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelinesService.findBoard(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um pipeline, opcionalmente com etapas' })
  @ApiCreatedResponse({ type: PipelineSummaryEntity })
  create(@Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados do pipeline' })
  @ApiOkResponse({ type: PipelineEntity })
  @ApiNotFoundResponse({ description: 'Pipeline não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o pipeline e suas etapas' })
  @ApiNoContentResponse({ description: 'Pipeline removido' })
  @ApiNotFoundResponse({ description: 'Pipeline não encontrado' })
  @ApiConflictResponse({ description: 'O pipeline ainda possui leads' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelinesService.remove(id);
  }
}
