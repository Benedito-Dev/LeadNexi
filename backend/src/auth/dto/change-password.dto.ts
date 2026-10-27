import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  /** Pelo menos 8 caracteres */
  @IsString()
  @MinLength(8, { message: 'A senha nova precisa ter pelo menos 8 caracteres.' })
  @MaxLength(200)
  newPassword: string;
}
