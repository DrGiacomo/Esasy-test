import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// Debe mantenerse alineado con el `switch (action)` de executor/src/executor.js.
// `assert` (genérico, lo emite la IA nl-to-flow) + las variantes explícitas que el
// executor implementa. `screenshot` captura un artefacto intermedio.
export const STEP_ACTIONS = [
  'click', 'fill', 'navigate', 'hover', 'wait', 'select', 'press', 'dblclick',
  'assert', 'assert_visible', 'assert_text', 'screenshot',
] as const;
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
