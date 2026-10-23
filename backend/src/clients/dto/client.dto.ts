import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'ENDED'])
  status?: 'ACTIVE' | 'PAUSED' | 'ENDED';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  plan?: string;

  /** Mensalidade em reais */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyFee?: number;

  /** Início do contrato (ISO 8601) */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** Dia do mês da cobrança (1 a 28) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  billingDay?: number;

  /** Verba diária de anúncio combinada; null limpa */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyAdBudget?: number | null;

  /** Acesso de parceiro no Business Manager (nunca pedir senha) */
  @IsOptional()
  @IsBoolean()
  partnerAccess?: boolean;

  /** WhatsApp Business do cliente com saudação automática */
  @IsOptional()
  @IsBoolean()
  whatsappGreeting?: boolean;

  /** Primeira campanha no ar */
  @IsOptional()
  @IsBoolean()
  firstCampaignLive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class SaveReportDto {
  /** Qualquer dia da semana (vale a segunda-feira dela): "2026-10-12" */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'weekStart deve estar no formato AAAA-MM-DD' })
  weekStart: string;

  /** Gasto da semana em reais */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  spend: number;

  /** Conversas iniciadas no WhatsApp */
  @IsInt()
  @Min(0)
  conversations: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AddPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  /** Mês que o pagamento cobre: "2026-11" */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period deve estar no formato AAAA-MM' })
  period: string;

  /** Quando o Pix entrou (padrão: agora) */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
