import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Actualización parcial de una suite.
 *
 * El PATCH usaba `CreateTestSuiteDto`, que exige `name`: cambiar solo la descripción era
 * imposible sin reenviar el nombre, y un cliente que no lo hiciera se comía un 400.
 * Hallazgo BAJO del audit 2026-07-12, cerrado el 2026-09-04.
 *
 * No se declara con `PartialType` para no añadir `@nestjs/mapped-types` por dos campos.
 */
export class UpdateTestSuiteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
