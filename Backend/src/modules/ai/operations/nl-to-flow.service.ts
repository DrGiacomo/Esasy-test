import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildNlToFlowPrompt } from '../prompts/nl-to-flow.prompt';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import type { AiProvider } from '../providers/ai-provider.interface';
import { parseAiJson } from '../util/parse-json';

@Injectable()
export class NlToFlowService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
  ) {}

  async convert(prompt: string, projectId: string, userId: string, orgId: string): Promise<unknown> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');
    const messages = buildNlToFlowPrompt(prompt, project.baseUrl);

    let result;
    try {
      result = await this.ai.complete(messages, undefined, { json: true });
      await this.audit.log(userId, AiOperationType.NL_TO_FLOW, `NL: "${prompt.substring(0, 80)}"`, result);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.NL_TO_FLOW, `NL: "${prompt.substring(0, 80)}"`, { error: String(err) });
      throw err;
    }

    // El modelo devuelve { steps: [...] }; se desempaqueta para preservar el contrato (array de pasos).
    const parsed = parseAiJson<{ steps?: unknown } | unknown[]>(result.content);
    return Array.isArray(parsed) ? parsed : (parsed.steps ?? []);
  }
}
