import {
  ArgumentsHost,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Converte erros conhecidos do Prisma em respostas HTTP adequadas,
 * em vez de deixá-los virar 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    super.catch(this.toHttpException(exception), host);
  }

  private toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException | Prisma.PrismaClientKnownRequestError {
    switch (exception.code) {
      // Registro não encontrado (update/delete em id inexistente)
      case 'P2025':
        return new NotFoundException('Registro não encontrado');
      // Violação de unicidade
      case 'P2002':
        return new ConflictException('Registro duplicado');
      // Violação de chave estrangeira (ex.: apagar etapa com leads)
      case 'P2003':
        return new ConflictException(
          'Operação bloqueada: existem registros relacionados',
        );
      default:
        return exception;
    }
  }
}
