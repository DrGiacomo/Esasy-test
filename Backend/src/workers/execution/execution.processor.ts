import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ExecutionStatus, Prisma, SecretType } from '@prisma/client';
import { Job } from 'bullmq';
import { createClient } from 'redis';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../../infrastructure/vault/vault.service';
import { ExecutionJobData, EXECUTION_QUEUE } from '../../modules/executions/queues/execution.queue';
import { DockerService } from './docker.service';
import { ArtifactCollectorService } from './artifact-collector.service';
import { AutoHealingService } from './auto-healing.service';

type RedisClient = ReturnType<typeof createClient>;

type WaitOutcome = { exitCode: number | null; aborted: 'cancelled' | 'timeout' | null };

const CANCEL_POLL_MS = 3000;

// Nombres de env que el runtime del executor reserva — un secreto nunca puede pisarlos.
const RESERVED_ENV = new Set([
  'EXECUTION_ID',
  'PROJECT_ID',
  'ORG_ID',
  'REDIS_URL',
  'DATABASE_URL',
  'RECORD_VIDEO',
  'MAX_PARALLEL',
  'PATH',
  'HOME',
  'NODE_OPTIONS',
]);

@Processor(EXECUTION_QUEUE)
export class ExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docker: DockerService,
    private readonly artifacts: ArtifactCollectorService,
    private readonly vault: VaultService,
    private readonly autoHealing: AutoHealingService,
  ) {
    super();
  }

  async process(job: Job<ExecutionJobData>): Promise<void> {
    const { executionId, projectId, orgId, suiteId, testId } = job.data;

    // Cliente Redis local al job — NUNCA un campo de instancia (el WorkerHost es singleton
    // y con concurrencia >1 dos jobs se pisarían el publisher).
    const publisher = createClient({ url: process.env.REDIS_URL });
    await publisher.connect();

    let containerId: string | undefined;

    try {
      await this.transition(publisher, executionId, ExecutionStatus.PROVISIONING);

      const tests = await this.getTests(projectId, suiteId, testId);
      if (tests.length === 0) {
        await this.transition(publisher, executionId, ExecutionStatus.COMPLETED);
        return;
      }

      // Idempotencia: limpiar resultados de un intento previo (reintento BullMQ) y recrear.
      await this.prisma.executionResult.deleteMany({ where: { executionId } });
      await this.prisma.executionResult.createMany({
        data: tests.map((t) => ({ executionId, testId: t.id, status: ExecutionStatus.RUNNING })),
      });

      // Config por proyecto: paralelismo y grabación de video (control de coste).
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { maxParallel: true, recordVideo: true },
      });

      const envVars = [
        `EXECUTION_ID=${executionId}`,
        `PROJECT_ID=${projectId}`,
        `ORG_ID=${orgId}`,
        `REDIS_URL=${process.env.CONTAINER_REDIS_URL ?? process.env.REDIS_URL}`,
        `DATABASE_URL=${process.env.CONTAINER_DATABASE_URL ?? process.env.DATABASE_URL}`,
        `RECORD_VIDEO=${project?.recordVideo === false ? 'false' : 'true'}`,
        ...(project?.maxParallel != null ? [`MAX_PARALLEL=${project.maxParallel}`] : []),
        ...(await this.getSecretEnvVars(orgId, executionId)),
      ];

      containerId = await this.docker.runExecutionContainer(executionId, envVars);
      await this.prisma.execution.update({
        where: { id: executionId },
        data: { dockerContainerId: containerId, startedAt: new Date() },
      });

      await this.transition(publisher, executionId, ExecutionStatus.RUNNING);

      const outcome = await this.waitForContainerOrAbort(containerId, executionId);

      // Si se abortó (cancelación o timeout), detener el contenedor ya mismo.
      if (outcome.aborted) {
        await this.docker.stopAndRemove(containerId);
        containerId = undefined; // ya removido — evita doble intento en el finally
      }

      if (outcome.aborted === 'cancelled') {
        this.logger.log(`Execution ${executionId} cancelled — container stopped`);
        await this.prisma.executionResult.updateMany({
          where: { executionId, status: ExecutionStatus.RUNNING },
          data: { status: ExecutionStatus.CANCELLED },
        });
        await this.publish(publisher, executionId, 'execution:status', {
          status: ExecutionStatus.CANCELLED,
        });
        return; // el status CANCELLED ya lo fijó cancel()
      }

      await this.transition(publisher, executionId, ExecutionStatus.COLLECTING);

      const results = await this.prisma.executionResult.findMany({ where: { executionId } });
      for (const result of results) {
        const urls = this.artifacts.getArtifactUrls(executionId, result.testId);
        await this.prisma.executionResult.update({ where: { id: result.id }, data: urls });
      }

      // Self-healing automático: propone fixes para los steps que fallaron. No bloquea
      // el cierre de la ejecución ante un error en la IA (best-effort).
      await this.autoHealing.run(executionId, orgId).catch((e) =>
        this.logger.error(`Auto-healing falló para ${executionId}: ${String(e)}`),
      );

      if (outcome.aborted === 'timeout') {
        await this.failExecution(publisher, executionId, `Execution timed out after ${this.timeoutMs()}ms`);
        return;
      }

      const finalStatus = outcome.exitCode === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
      await this.transition(publisher, executionId, finalStatus);
    } catch (err) {
      this.logger.error(`Execution ${executionId} failed: ${String(err)}`);
      if (!this.isDeleted(err)) {
        await this.failExecution(publisher, executionId, String(err)).catch((e) => {
          if (!this.isDeleted(e)) throw e;
        });
      }
    } finally {
      // Garantiza que ningún contenedor quede huérfano ante cualquier salida.
      if (containerId) await this.docker.stopAndRemove(containerId).catch(() => undefined);
      await publisher.disconnect().catch(() => undefined);
    }
  }

  /**
   * Espera a que el contenedor termine, compitiendo contra:
   *  - cancelación del usuario (poll del status en BD cada 3s)
   *  - timeout máximo de ejecución
   */
  private async waitForContainerOrAbort(containerId: string, executionId: string): Promise<WaitOutcome> {
    const timers: NodeJS.Timeout[] = [];
    let active = true;

    const exitP: Promise<WaitOutcome> = this.docker
      .waitForContainer(containerId)
      .then((r) => ({ exitCode: r.exitCode, aborted: null }));

    const timeoutP = new Promise<WaitOutcome>((resolve) => {
      timers.push(setTimeout(() => resolve({ exitCode: null, aborted: 'timeout' }), this.timeoutMs()));
    });

    const cancelP = new Promise<WaitOutcome>((resolve) => {
      const poll = async () => {
        if (!active) return;
        const ex = await this.prisma.execution
          .findUnique({ where: { id: executionId }, select: { status: true } })
          .catch(() => null);
        if (!active) return;
        if (!ex || ex.status === ExecutionStatus.CANCELLED) {
          resolve({ exitCode: null, aborted: 'cancelled' });
          return;
        }
        timers.push(setTimeout(() => void poll(), CANCEL_POLL_MS));
      };
      timers.push(setTimeout(() => void poll(), CANCEL_POLL_MS));
    });

    try {
      return await Promise.race([exitP, timeoutP, cancelP]);
    } finally {
      active = false;
      timers.forEach(clearTimeout);
    }
  }

  private async transition(
    publisher: RedisClient,
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void> {
    // No pisar una cancelación realizada por el usuario mientras el job seguía vivo.
    if (status !== ExecutionStatus.PROVISIONING) {
      const cur = await this.prisma.execution
        .findUnique({ where: { id: executionId }, select: { status: true } })
        .catch(() => null);
      if (!cur) return; // borrada
      if (cur.status === ExecutionStatus.CANCELLED) {
        this.logger.warn(`Execution ${executionId} already CANCELLED — skipping → ${status}`);
        return;
      }
    }

    const data: Record<string, unknown> = { status };
    if (
      ([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED] as ExecutionStatus[]).includes(
        status,
      )
    ) {
      data['completedAt'] = new Date();
    }
    try {
      await this.prisma.execution.update({ where: { id: executionId }, data });
    } catch (err) {
      if (this.isDeleted(err)) {
        this.logger.warn(`Execution ${executionId} was deleted — skipping transition to ${status}`);
        return;
      }
      throw err;
    }
    await this.publish(publisher, executionId, 'execution:status', { status });
    this.logger.log(`Execution ${executionId} → ${status}`);
  }

  private async failExecution(publisher: RedisClient, executionId: string, message: string): Promise<void> {
    const cur = await this.prisma.execution
      .findUnique({ where: { id: executionId }, select: { status: true } })
      .catch(() => null);
    if (!cur || cur.status === ExecutionStatus.CANCELLED) return; // no clobber cancel/borrada
    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.FAILED, errorMessage: message, completedAt: new Date() },
    });
    // Los executionResult pre-creados quedan en RUNNING si el contenedor nunca los
    // actualiza (fallo de provisioning, timeout o excepción del worker). Cerrarlos a
    // FAILED para que la UI no muestre tests "corriendo" dentro de una ejecución fallida.
    await this.prisma.executionResult
      .updateMany({
        where: { executionId, status: ExecutionStatus.RUNNING },
        data: { status: ExecutionStatus.FAILED },
      })
      .catch(() => undefined);
    await this.publish(publisher, executionId, 'execution:error', { message });
  }

  private async publish(
    publisher: RedisClient,
    executionId: string,
    event: string,
    payload: object,
  ): Promise<void> {
    await publisher.publish(
      `execution:${executionId}:events`,
      JSON.stringify({ event, executionId, ...payload, timestamp: Date.now() }),
    );
  }

  /**
   * Secretos de tipo ENV_VAR de la organización, descifrados e inyectados como
   * variables de entorno en el contenedor del executor. Los pasos los referencian
   * con la sintaxis `{{NOMBRE}}` (resuelta dentro del executor). Nunca se exponen
   * al frontend ni se registran en logs.
   */
  private async getSecretEnvVars(orgId: string, executionId: string): Promise<string[]> {
    const secrets = await this.prisma.secret.findMany({
      where: { organizationId: orgId, type: SecretType.ENV_VAR },
      select: { name: true, encryptedValue: true },
    });

    const env: string[] = [];
    for (const s of secrets) {
      if (RESERVED_ENV.has(s.name)) {
        this.logger.warn(`Secret "${s.name}" usa un nombre de env reservado — omitido`);
        continue;
      }
      try {
        env.push(`${s.name}=${this.vault.decrypt(s.encryptedValue)}`);
      } catch (err) {
        // No abortar la ejecución por un secreto corrupto; registrar sin filtrar el valor.
        this.logger.error(`No se pudo descifrar el secreto "${s.name}": ${String(err)}`);
      }
    }
    if (env.length > 0) {
      this.logger.log(`Inyectando ${env.length} secreto(s) en la ejecución ${executionId}`);
    }
    return env;
  }

  private timeoutMs(): number {
    return parseInt(process.env.EXECUTION_TIMEOUT_MS ?? '600000', 10);
  }

  private isDeleted(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
  }

  private async getTests(projectId: string, suiteId?: string, testId?: string) {
    return this.prisma.test.findMany({
      where: {
        ...(testId ? { id: testId } : {}),
        suite: {
          projectId,
          ...(suiteId ? { id: suiteId } : {}),
          isArchived: false,
        },
        status: 'ACTIVE',
      },
      include: { steps: { orderBy: { order: 'asc' }, where: { isDisabled: false } } },
    });
  }
}
