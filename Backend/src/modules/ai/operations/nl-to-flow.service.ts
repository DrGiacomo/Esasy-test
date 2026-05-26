import { Inject, Injectable } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildNlToFlowPrompt } from '../prompts/nl-to-flow.prompt';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import type { AiProvider } from '../providers/ai-provider.interface';

@Injectable()
export class NlToFlowService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
  ) {}

  async convert(prompt: string, projectId: string, userId: string): Promise<unknown> {
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const messages = buildNlToFlowPrompt(prompt, project.baseUrl);

    let result;
    try {
      result = await this.ai.complete(messages);
      await this.audit.log(userId, AiOperationType.NL_TO_FLOW, `NL: "${prompt.substring(0, 80)}"`, result);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.NL_TO_FLOW, `NL: "${prompt.substring(0, 80)}"`, { error: String(err) });
      throw err;
    }

    return JSON.parse(result.content);
  }
}
