import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartAgentRunDto {
  /** slug do agente que acordou, ex.: "criador" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  agent: string;
}

export class FinishAgentRunDto {
  @IsIn(['SUCCEEDED', 'FAILED'])
  status: 'SUCCEEDED' | 'FAILED';

  /** O que produziu ou por que falhou, em poucas linhas */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;
}
