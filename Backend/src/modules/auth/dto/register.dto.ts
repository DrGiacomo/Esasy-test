import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  organizationName: string;
}
