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
  Query,
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
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { MoveLeadDto } from './dto/move-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import {
  LeadWithStageEntity,
  PaginatedLeadsEntity,
} from './entities/lead.entity.js';
import { LeadsService } from './leads.service.js';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista leads com busca, filtros e paginação' })
  @ApiOkResponse({ type: PaginatedLeadsEntity })
  findAll(@Query() query: QueryLeadsDto) {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do lead' })
  @ApiOkResponse({ type: LeadWithStageEntity })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um lead no fim da etapa informada' })
  @ApiCreatedResponse({ type: LeadWithStageEntity })
  @ApiNotFoundResponse({ description: 'Etapa não encontrada' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados do lead' })
  @ApiOkResponse({ type: LeadWithStageEntity })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({
    summary: 'Move o card para outra etapa e/ou posição (arrastar no Kanban)',
  })
  @ApiOkResponse({ type: LeadWithStageEntity })
  @ApiNotFoundResponse({ description: 'Lead ou etapa não encontrados' })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveLeadDto) {
    return this.leadsService.move(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o lead' })
  @ApiNoContentResponse({ description: 'Lead removido' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.remove(id);
  }
}
