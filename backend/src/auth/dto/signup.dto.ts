import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
