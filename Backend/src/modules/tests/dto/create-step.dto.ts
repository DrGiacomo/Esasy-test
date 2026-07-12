import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const STEP_ACTIONS = ['click', 'fill', 'navigate', 'assert', 'hover', 'wait', 'select', 'press', 'dblclick'] as const;
export const STEP_SELECTOR_TYPES = ['css', 'xpath', 'text', 'role', 'testId'] as const;

export class CreateStepDto {
  @IsNumber()
  order: number;

  @IsIn(STEP_ACTIONS)
  action: string;

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
}
