import { Inject, Injectable } from '@nestjs/common';
import { AiOperationType, HealingStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildSelfHealingPrompt } from '../prompts/self-healing.prompt';
import type { AiProvider } from '../providers/ai-provider.interface';
import { AI_PROVIDER } from '../providers/ai-provider.interface';

@Injectable()
export class SelfHealingService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
  ) {}

  async propose(stepId: string, pageHtml: string, userId: string) {
    const step = await this.prisma.testStep.findUniqueOrThrow({
      where: { id: stepId },
      include: { test: true },
    });

    const messages = buildSelfHealingPrompt(step.action, step.selector ?? '', pageHtml);

    let result;
    try {
      result = await this.ai.complete(messages);
      await this.audit.log(userId, AiOperationType.SELF_HEALING, `Heal step: ${stepId}`, result, step.testId);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.SELF_HEALING, `Heal step: ${stepId}`, { error: String(err) }, step.testId);
      throw err;
    }

    const parsed = JSON.parse(result.content) as {
      selector: string;
      selectorType: string;
      confidence: number;
      reasoning: string;
    };

    // Marcar propuestas anteriores como SUPERSEDED
    await this.prisma.selectorHealingLog.updateMany({
      where: { stepId, status: HealingStatus.PENDING_APPROVAL },
      data: { status: HealingStatus.SUPERSEDED },
    });

    return this.prisma.selectorHealingLog.create({
      data: {
        testId: step.testId,
        stepId,
        brokenSelector: step.selector ?? '',
        proposedSelector: parsed.selector,
        confidenceBefore: step.confidenceScore ?? 0,
        confidenceAfter: parsed.confidence,
        reasoning: parsed.reasoning,
        status: HealingStatus.PENDING_APPROVAL,
      },
    });
  }

  async approve(healingLogId: string, userId: string) {
    const log = await this.prisma.selectorHealingLog.findUniqueOrThrow({
      where: { id: healingLogId },
    });

    // Aplicar el fix al TestStep
    await this.prisma.testStep.update({
      where: { id: log.stepId },
      data: {
        selector: log.proposedSelector,
        confidenceScore: log.confidenceAfter,
      },
    });

    return this.prisma.selectorHealingLog.update({
      where: { id: healingLogId },
      data: { status: HealingStatus.APPROVED, reviewedBy: userId, approvedAt: new Date() },
    });
  }

  async reject(healingLogId: string, userId: string, reason?: string) {
    return this.prisma.selectorHealingLog.update({
      where: { id: healingLogId },
      data: {
        status: HealingStatus.REJECTED,
        reviewedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }
}
