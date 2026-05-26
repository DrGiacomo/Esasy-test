import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StepOrderItem {
  @IsString()
  stepId: string;

  @IsNumber()
  order: number;
}

export class ReorderStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepOrderItem)
  steps: StepOrderItem[];
}
