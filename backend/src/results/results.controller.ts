import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateProspectingSettingsDto } from './dto/update-prospecting-settings.dto.js';
import { ProspectingSettingsEntity } from './entities/prospecting-settings.entity.js';
import { ResultsService } from './results.service.js';

@ApiTags('Resultados')
@ApiBearerAuth()
@Controller('results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get()
  @ApiOperation({ summary: 'Placar semanal, mensal e desempenho da prospecção' })
  @ApiOkResponse({ description: 'Indicadores calculados a partir do histórico' })
  dashboard() {
    return this.results.getDashboard();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Metas da operação' })
  @ApiOkResponse({ type: ProspectingSettingsEntity })
  settings() {
    return this.results.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Atualiza metas da operação' })
  @ApiOkResponse({ type: ProspectingSettingsEntity })
  updateSettings(@Body() dto: UpdateProspectingSettingsDto) {
    return this.results.updateSettings(dto);
  }
}
