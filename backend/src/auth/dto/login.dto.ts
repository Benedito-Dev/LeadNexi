import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /** @example "voce@email.com" */
  @IsEmail()
  email: string;

  /** @example "sua-senha" */
  @IsString()
  @IsNotEmpty()
  password: string;
}
