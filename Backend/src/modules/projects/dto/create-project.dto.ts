import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsUrl()
  baseUrl: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxParallel?: number;

  @IsOptional()
  @IsBoolean()
  recordVideo?: boolean;
}
