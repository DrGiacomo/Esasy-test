import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOperationType, HealingStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildSelfHealingPrompt } from '../prompts/self-healing.prompt';
import type { AiProvider } from '../providers/ai-provider.interface';
import { AI_PROVIDER, VISION_PROVIDER } from '../providers/ai-provider.interface';
import { parseAiJson } from '../util/parse-json';

interface ParsedProposal {
  selector?: string;
  selectorType?: string;
  confidence?: number;
  reasoning?: string;
}

type StepForHealing = {
  id: string;
  action: string;
  selector: string | null;
  testId: string;
  confidenceScore: number | null;
};

@Injectable()
export class SelfHealingService {
  private readonly logger = new Logger(SelfHealingService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
    @Inject(VISION_PROVIDER) private readonly vision: AiProvider,
    private readonly config: ConfigService,
  ) {}

  /** Propuesta solicitada manualmente por un usuario (endpoint /ai/heal). */
  async propose(
    stepId: string,
    pageHtml: string,
    userId: string,
    orgId: string,
    screenshot?: string,
  ) {
    const step = await this.findStep(stepId, orgId);
    if (!step) throw new NotFoundException('Test step not found');

    const { parsed } = await this.runProposal(step, pageHtml, userId, screenshot);
    if (!parsed.selector || typeof parsed.confidence !== 'number') {
      throw new BadRequestException('AI returned an invalid selector proposal');
    }

    return this.persistProposal(step, parsed);
  }

  /**
   * Propuesta automática disparada por el worker tras un fallo de step. No lanza
   * excepciones (corre en background): registra y devuelve null si no procede.
   * - Deduplica: no crea otra propuesta si ya hay una PENDING_APPROVAL para el step.
   * - Gatea por confianza mínima (SELF_HEALING_MIN_CONFIDENCE) para no generar ruido.
   */
  async proposeAutomatic(params: {
    stepId: string;
    pageHtml: string;
    screenshot?: string;
    userId: string;
    orgId: string;
  }): Promise<{ id: string } | null> {
    const { stepId, pageHtml, screenshot, userId, orgId } = params;
    try {
      const step = await this.findStep(stepId, orgId);
      if (!step || !step.selector) return null;

      const existing = await this.prisma.selectorHealingLog.findFirst({
        where: { stepId, status: HealingStatus.PENDING_APPROVAL },
        select: { id: true },
      });
      if (existing) {
        this.logger.log(`Step ${stepId} ya tiene una propuesta pendiente — auto-heal omitido`);
        return existing;
      }

      const { parsed } = await this.runProposal(step, pageHtml, userId, screenshot);
      if (!parsed.selector || typeof parsed.confidence !== 'number') {
        this.logger.warn(`Auto-heal: propuesta inválida para step ${stepId}`);
        return null;
      }

      const minConfidence = this.config.get<number>('SELF_HEALING_MIN_CONFIDENCE', 0.5);
      if (parsed.confidence < minConfidence) {
        this.logger.log(
          `Auto-heal: confianza ${parsed.confidence} < ${minConfidence} para step ${stepId} — descartado`,
        );
        return null;
      }

      const log = await this.persistProposal(step, parsed);
      this.logger.log(
        `Auto-heal: propuesta ${log.id} creada para step ${stepId} (conf ${parsed.confidence})`,
      );
      return log;
    } catch (err) {
      this.logger.error(`Auto-heal falló para step ${stepId}: ${String(err)}`);
      return null;
    }
  }

  private findStep(stepId: string, orgId: string): Promise<StepForHealing | null> {
    return this.prisma.testStep.findFirst({
      where: { id: stepId, test: { suite: { project: { organizationId: orgId } } } },
      select: { id: true, action: true, selector: true, testId: true, confidenceScore: true },
    });
  }

  private async runProposal(
    step: StepForHealing,
    pageHtml: string,
    userId: string,
    screenshot?: string,
  ): Promise<{ parsed: ParsedProposal }> {
    // Usa el proveedor de visión solo si hay screenshot y el proveedor lo soporta;
    // si no, recae en el de texto. Así el screenshot del fallo afina la propuesta.
    const useVision = !!screenshot && this.vision.supportsImages?.() === true;
    const provider = useVision ? this.vision : this.ai;

    const messages = buildSelfHealingPrompt(step.action, step.selector ?? '', pageHtml, useVision);
    if (useVision && screenshot) {
      messages[messages.length - 1].images = [screenshot];
    }

    let result;
    try {
      result = await provider.complete(messages, undefined, { json: true });
      await this.audit.log(
        userId,
        AiOperationType.SELF_HEALING,
        `Heal step: ${step.id}`,
        result,
        step.testId,
      );
    } catch (err) {
      await this.audit.log(
        userId,
        AiOperationType.SELF_HEALING,
        `Heal step: ${step.id}`,
        { error: String(err) },
        step.testId,
      );
      throw err;
    }

    return { parsed: parseAiJson<ParsedProposal>(result.content) };
  }

  private async persistProposal(step: StepForHealing, parsed: ParsedProposal) {
    await this.prisma.selectorHealingLog.updateMany({
      where: { stepId: step.id, status: HealingStatus.PENDING_APPROVAL },
      data: { status: HealingStatus.SUPERSEDED },
    });

    return this.prisma.selectorHealingLog.create({
      data: {
        testId: step.testId,
        stepId: step.id,
        brokenSelector: step.selector ?? '',
        proposedSelector: parsed.selector!,
        confidenceBefore: step.confidenceScore ?? 0,
        confidenceAfter: parsed.confidence!,
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

    // Igual que approve(): solo se rechaza una propuesta pendiente. Sin esto se podía
    // "rechazar" un log ya APPROVED, dejando el selector aplicado con status REJECTED.
    if (log.status !== HealingStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Healing log is not pending approval (status: ${log.status})`);
    }

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
