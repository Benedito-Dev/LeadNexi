import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto.js';
import { LeadActivityEntity } from './entities/lead-activity.entity.js';
import { LeadWithStageEntity } from './entities/lead.entity.js';
import { LeadActivitiesService } from './lead-activities.service.js';

@ApiTags('Histórico do lead')
@ApiBearerAuth()
@Controller('leads/:id')
export class LeadActivitiesController {
  constructor(private readonly activities: LeadActivitiesService) {}

  @Get('activities')
  @ApiOperation({ summary: 'Histórico do lead (mais novo primeiro)' })
  @ApiOkResponse({ type: [LeadActivityEntity] })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  list(@Param('id', ParseUUIDPipe) id: string) {
    return this.activities.list(id);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Adiciona uma anotação ao histórico' })
  @ApiCreatedResponse({ type: LeadActivityEntity })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  addNote(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateNoteDto) {
    return this.activities.addNote(id, dto);
  }

  @Delete('notes/:activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apaga uma anotação (eventos do sistema não)' })
  @ApiNoContentResponse({ description: 'Anotação apagada' })
  @ApiBadRequestResponse({ description: 'O item não é uma anotação' })
  @ApiNotFoundResponse({ description: 'Anotação não encontrada' })
  removeNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.activities.removeNote(id, activityId);
  }

  @Put('follow-up')
  @ApiOperation({ summary: 'Agenda ou reagenda o próximo contato' })
  @ApiOkResponse({ type: LeadWithStageEntity })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  scheduleFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleFollowUpDto,
  ) {
    return this.activities.scheduleFollowUp(id, dto);
  }

  @Post('follow-up/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca o próximo contato como feito' })
  @ApiOkResponse({ type: LeadWithStageEntity })
  @ApiBadRequestResponse({ description: 'Lead sem contato agendado' })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  completeFollowUp(@Param('id', ParseUUIDPipe) id: string) {
    return this.activities.completeFollowUp(id);
  }

  @Delete('follow-up')
  @ApiOperation({
    summary: 'Desmarca o próximo contato (sem registrar como feito)',
  })
  @ApiOkResponse({ type: LeadWithStageEntity })
  @ApiNotFoundResponse({ description: 'Lead não encontrado' })
  cancelFollowUp(@Param('id', ParseUUIDPipe) id: string) {
    return this.activities.cancelFollowUp(id);
  }
}
