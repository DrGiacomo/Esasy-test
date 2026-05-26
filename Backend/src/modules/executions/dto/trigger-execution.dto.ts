import { IsOptional, IsUUID } from 'class-validator';

export class TriggerExecutionDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  suiteId?: string;
}
