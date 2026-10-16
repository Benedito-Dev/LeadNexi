import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

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
}
