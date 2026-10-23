import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service.js';
import { AddPaymentDto, SaveReportDto, UpdateClientDto } from './dto/client.dto.js';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Clientes (ativos primeiro), com cobrança, relatórios e pagamentos' })
  @ApiOkResponse({ description: 'Lista de clientes' })
  list() {
    return this.clients.list();
  }

  // Antes de ':id', para "reminders" não ser lido como id
  @Get('reminders')
  @ApiOperation({ summary: 'Lembretes da tela Hoje: renovação em até 3 dias e relatório da semana passada pendente' })
  @ApiOkResponse({ description: '{ renewals, pendingReports }' })
  reminders() {
    return this.clients.reminders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha do cliente' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza a ficha (plano, mensalidade, cobrança, verba, checklist de entrada)' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Put(':id/reports')
  @ApiOperation({ summary: 'Lança (ou corrige) o relatório de uma semana: gasto e conversas' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  saveReport(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveReportDto) {
    return this.clients.saveReport(id, dto);
  }

  @Delete(':id/reports/:reportId')
  @ApiOperation({ summary: 'Apaga um relatório semanal' })
  @ApiNotFoundResponse({ description: 'Relatório não encontrado' })
  removeReport(@Param('id', ParseUUIDPipe) id: string, @Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.clients.removeReport(id, reportId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Registra um pagamento recebido (Pix) para um mês' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado' })
  addPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPaymentDto) {
    return this.clients.addPayment(id, dto);
  }

  @Delete(':id/payments/:paymentId')
  @ApiOperation({ summary: 'Apaga um pagamento registrado por engano' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado' })
  removePayment(@Param('id', ParseUUIDPipe) id: string, @Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.clients.removePayment(id, paymentId);
  }
}
