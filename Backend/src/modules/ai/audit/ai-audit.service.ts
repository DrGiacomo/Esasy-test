import { Injectable } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiResponse } from '../providers/ai-provider.interface';

@Injectable()
export class AiAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string,
    operationType: AiOperationType,
    promptSummary: string,
    result: AiResponse | { error: string },
    relatedTestId?: string,
  ): Promise<void> {
    const success = !('error' in result);

    await this.prisma.aiAuditLog.create({
      data: {
        userId,
        operationType,
        modelUsed: success ? result.modelUsed : 'unknown',
        promptSummary,
        inputTokens: success ? result.inputTokens : null,
        outputTokens: success ? result.outputTokens : null,
        latencyMs: success ? result.latencyMs : null,
        success,
        errorMessage: success ? null : result.error,
        relatedTestId,
      },
    });
  }
}
