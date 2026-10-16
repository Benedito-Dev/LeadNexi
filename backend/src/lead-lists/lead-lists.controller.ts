import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateLeadListDto } from './dto/create-lead-list.dto.js';
import { UpdateLeadListDto } from './dto/update-lead-list.dto.js';
import { LeadListEntity } from './entities/lead-list.entity.js';
import { LeadListsService } from './lead-lists.service.js';

@ApiTags('Lead lists')
@ApiBearerAuth()
@Controller('lead-lists')
export class LeadListsController {
  constructor(private readonly lists: LeadListsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista nichos e listas de prospecção' })
  @ApiOkResponse({ type: [LeadListEntity] })
  findAll() {
    return this.lists.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma lista de prospecção' })
  @ApiCreatedResponse({ type: LeadListEntity })
  create(@Body() dto: CreateLeadListDto) {
    return this.lists.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza ou arquiva uma lista' })
  @ApiOkResponse({ type: LeadListEntity })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadListDto) {
    return this.lists.update(id, dto);
  }
}
