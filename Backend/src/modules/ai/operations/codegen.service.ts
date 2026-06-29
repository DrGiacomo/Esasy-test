import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildCodegenPrompt } from '../prompts/codegen.prompt';
import type { AiProvider } from '../providers/ai-provider.interface';
import { AI_PROVIDER } from '../providers/ai-provider.interface';

@Injectable()
export class CodegenService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
  ) {}

  async generate(testId: string, userId: string, orgId: string): Promise<string> {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, suite: { project: { organizationId: orgId } } },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!test) throw new NotFoundException('Test not found');

    const messages = buildCodegenPrompt(test.name, test.flowModel);

    let result;
    try {
      result = await this.ai.complete(messages, 'deepseek-coder');
      await this.audit.log(userId, AiOperationType.CODEGEN, `Codegen for test: ${test.name}`, result, testId);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.CODEGEN, `Codegen for test: ${test.name}`, { error: String(err) }, testId);
      throw err;
    }

    await this.prisma.test.update({
      where: { id: testId },
      data: { generatedCode: result.content },
    });

    return result.content;
  }
}
