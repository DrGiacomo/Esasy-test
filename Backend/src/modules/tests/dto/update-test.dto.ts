import { TestStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Campos editables de un test. Whitelist explícita: nunca aceptar `suiteId`
 * (permitiría mover el test a una suite de otra organización) ni `currentVersion`.
 */
export class UpdateTestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** JSON del editor de flujos; se persiste tal cual. */
  @IsOptional()
  flowModel?: unknown;

  @IsOptional()
  @IsString()
  generatedCode?: string;

  @IsOptional()
  @IsIn(Object.values(TestStatus))
  status?: TestStatus;
}
