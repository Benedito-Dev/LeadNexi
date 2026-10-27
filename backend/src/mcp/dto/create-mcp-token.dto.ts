import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMcpTokenDto {
  /** Onde o token vai ser usado, ex.: "Claude Code no notebook" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
}
