import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SecretType } from '@prisma/client';

export class CreateSecretDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  value: string;

  @IsEnum(SecretType)
  type: SecretType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
