import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StepResultStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { SelfHealingService } from '../../modules/ai/operations/self-healing.service';

/**
 * Tras una ejecución fallida, dispara propuestas de self-healing automáticas para los
 * steps que fallaron, usando el HTML y el screenshot que el executor dejó en el volumen
 * de artefactos (`${stepId}_failure.html` / `${stepId}_failure.png`). Las propuestas se
 * crean en estado PENDING_APPROVAL: el humano sigue en el bucle de decisión.
 */
@Injectable()
export class AutoHealingService {
  private readonly logger = new Logger(AutoHealingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly selfHealing: SelfHealingService,
  ) {}

  async run(executionId: string, orgId: string): Promise<void> {
    if (!this.config.get<boolean>('AUTO_HEALING_ENABLED', true)) return;

    const failedSteps = await this.prisma.stepResult.findMany({
      where: {
        status: StepResultStatus.FAILED,
        executionResult: { executionId },
        step: { selector: { not: null } },
      },
      select: { stepId: true },
    });
    if (failedSteps.length === 0) return;

    // Disparador del audit log: el usuario que lanzó la ejecución.
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      select: { triggeredBy: true },
    });
    const userId = execution?.triggeredBy;
    if (!userId) {
      this.logger.warn(`Auto-heal: ejecución ${executionId} sin triggeredBy — omitido`);
      return;
    }

    const base = this.config.get<string>('ARTIFACTS_VOLUME_PATH', '/artifacts');
    this.logger.log(`Auto-heal: ${failedSteps.length} step(s) fallido(s) en ejecución ${executionId}`);

    for (const { stepId } of failedSteps) {
      const pageHtml = this.readText(path.join(base, executionId, `${stepId}_failure.html`));
      if (!pageHtml) continue; // sin HTML no hay nada que analizar

      const screenshot = this.readImageBase64(path.join(base, executionId, `${stepId}_failure.png`));
      await this.selfHealing.proposeAutomatic({ stepId, pageHtml, screenshot, userId, orgId });
    }
  }

  private readText(filePath: string): string | null {
    try {
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
    } catch (err) {
      this.logger.warn(`No se pudo leer ${filePath}: ${String(err)}`);
      return null;
    }
  }

  private readImageBase64(filePath: string): string | undefined {
    try {
      if (!fs.existsSync(filePath)) return undefined;
      return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
    } catch {
      return undefined;
    }
  }
}
