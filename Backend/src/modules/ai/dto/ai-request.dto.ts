import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsUUID()
  relatedTestId?: string;
}

export class CodegenRequestDto {
  @IsUUID()
  testId: string;
}

export class NlToFlowRequestDto {
  @IsString()
  prompt: string;

  @IsUUID()
  projectId: string;
}

export class HealStepRequestDto {
  @IsUUID()
  stepId: string;

  @IsString()
  pageHtml: string;
}

export class HealingReviewDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
