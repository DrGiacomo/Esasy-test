import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AiOperationType, HealingStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildSelfHealingPrompt } from '../prompts/self-healing.prompt';
import type { AiProvider } from '../providers/ai-provider.interface';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import { parseAiJson } from '../util/parse-json';

@Injectable()
export class SelfHealingService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
  ) {}

  async propose(stepId: string, pageHtml: string, userId: string, orgId: string) {
    const step = await this.prisma.testStep.findFirst({
      where: { id: stepId, test: { suite: { project: { organizationId: orgId } } } },
      include: { test: true },
    });
    if (!step) throw new NotFoundException('Test step not found');

    const messages = buildSelfHealingPrompt(step.action, step.selector ?? '', pageHtml);

    let result;
    try {
      result = await this.ai.complete(messages, undefined, { json: true });
      await this.audit.log(userId, AiOperationType.SELF_HEALING, `Heal step: ${stepId}`, result, step.testId);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.SELF_HEALING, `Heal step: ${stepId}`, { error: String(err) }, step.testId);
      throw err;
    }

    const parsed = parseAiJson<{
      selector?: string;
      selectorType?: string;
      confidence?: number;
      reasoning?: string;
    }>(result.content);

    if (!parsed.selector || typeof parsed.confidence !== 'number') {
      throw new BadRequestException('AI returned an invalid selector proposal');
    }

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
        reasoning: parsed.reasoning ?? '',
        status: HealingStatus.PENDING_APPROVAL,
      },
    });
  }

  async approve(healingLogId: string, userId: string, orgId: string) {
    const log = await this.prisma.selectorHealingLog.findFirst({
      where: { id: healingLogId, test: { suite: { project: { organizationId: orgId } } } },
    });
    if (!log) throw new NotFoundException('Healing log not found');

    if (log.status !== HealingStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Healing log is not pending approval (status: ${log.status})`);
    }

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

  async reject(healingLogId: string, userId: string, orgId: string, reason?: string) {
    const log = await this.prisma.selectorHealingLog.findFirst({
      where: { id: healingLogId, test: { suite: { project: { organizationId: orgId } } } },
    });
    if (!log) throw new NotFoundException('Healing log not found');

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
