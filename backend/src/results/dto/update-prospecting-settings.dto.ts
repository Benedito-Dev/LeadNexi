import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProspectingSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyTarget?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  weeklyTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRevenueGoal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  decisionContacts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  decisionMinReplies?: number;

  /** 1ª mensagem da cadência. Vazio volta ao texto padrão. Marcadores: {saudacao}, {loja}, {data}. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  messageFirst?: string;

  /** Follow-up 1 (retomada). Vazio volta ao texto padrão. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  messageFollowUp?: string;

  /** Follow-up final. Vazio volta ao texto padrão. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  messageLast?: string;
}
