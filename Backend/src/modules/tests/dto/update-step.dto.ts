import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { STEP_ACTIONS, STEP_SELECTOR_TYPES } from './create-step.dto';

/**
 * Campos editables de un paso. Whitelist explícita: nunca aceptar `testId`
 * (permitiría reasignar el paso a un test de otra organización).
 * Nota: `Partial<CreateStepDto>` NO sirve aquí — en runtime es `Object` y el
 * ValidationPipe se saltaría la validación por completo.
 */
export class UpdateStepDto {
  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsIn(STEP_ACTIONS)
  action?: string;

  @IsOptional()
  @IsString()
  selector?: string;

  @IsOptional()
  @IsIn(STEP_SELECTOR_TYPES)
  selectorType?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}
