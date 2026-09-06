import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ExecutionStatus, Prisma, SecretType } from '@prisma/client';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createClient } from 'redis';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../../infrastructure/vault/vault.service';
import { ExecutionJobData, EXECUTION_QUEUE } from '../../modules/executions/queues/execution.queue';
import { DockerService } from './docker.service';
import { ArtifactCollectorService } from './artifact-collector.service';
import { AutoHealingService } from './auto-healing.service';

type RedisClient = ReturnType<typeof createClient>;

type WaitOutcome = { exitCode: number | null; aborted: 'cancelled' | 'timeout' | null };

// El sondeo pasa de 3 s a 15 s: ahora la via rapida es el aviso por Redis y esto es la red
// de seguridad. Redis pub/sub NO persiste — si el worker esta reconectando cuando llega el
// aviso, se pierde — asi que el sondeo no se quita, solo se espacia.
const CANCEL_POLL_MS = 15000;

/** Canal por el que el backend avisa de una cancelacion. Debe coincidir con el del servicio. */
const CANAL_CANCELACION = 'execution:cancel';

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

      const secretEnvVars = await this.getSecretEnvVars(orgId, executionId);
      // Los VALORES, para taparlos si aparecen en los logs del contenedor. Un secreto que
      // acaba en cualquier registro ya es publico (`C4`), y los logs se guardan mas abajo.
      const secretValues = secretEnvVars
        .map((e) => e.slice(e.indexOf('=') + 1))
        .filter((v) => v.length >= 4);

      const envVars = [
        `EXECUTION_ID=${executionId}`,
        `PROJECT_ID=${projectId}`,
        `ORG_ID=${orgId}`,
        `REDIS_URL=${process.env.CONTAINER_REDIS_URL ?? process.env.REDIS_URL}`,
        `DATABASE_URL=${process.env.CONTAINER_DATABASE_URL ?? process.env.DATABASE_URL}`,
        `RECORD_VIDEO=${project?.recordVideo === false ? 'false' : 'true'}`,
        ...(project?.maxParallel != null ? [`MAX_PARALLEL=${project.maxParallel}`] : []),
        ...secretEnvVars,
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
        const urls = await this.artifacts.getArtifactUrls(executionId, result.testId);
        await this.prisma.executionResult.update({ where: { id: result.id }, data: urls });
      }

      // Self-healing automático: propone fixes para los steps que fallaron. No bloquea
      // el cierre de la ejecución ante un error en la IA (best-effort).
      await this.autoHealing
        .run(executionId, orgId)
        .catch((e) => this.logger.error(`Auto-healing falló para ${executionId}: ${String(e)}`));

      if (outcome.aborted === 'timeout') {
        await this.failExecution(
          publisher,
          executionId,
          `Execution timed out after ${this.timeoutMs()}ms`,
        );
        return;
      }

      // Si el contenedor no salio limpio, guardar lo que dijo ANTES de que el `finally`
      // lo elimine. Es la unica forma de distinguir "fallo la prueba del usuario" de
      // "fallo el motor", que hasta hoy se veian igual desde la pantalla.
      if (outcome.exitCode !== 0 && containerId) {
        await this.guardarLogsDelFallo(executionId, containerId, secretValues);
      }

      const finalStatus =
        outcome.exitCode === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
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
  /**
   * Deja por escrito lo que dijo el contenedor cuando no salio con codigo 0.
   *
   * Guarda dos cosas y a proposito:
   *   - el log completo como artefacto (`executor.log`), que se descarga igual que el video
   *   - un extracto en `errorMessage`, que es lo que se ve sin buscar nada
   *
   * Los valores de los secretos inyectados se tapan antes de escribir nada. Y todo el
   * metodo es best-effort: si falla, no toca el resultado de la ejecucion (`S3`).
   */
  private async guardarLogsDelFallo(
    executionId: string,
    containerId: string,
    secretValues: string[],
  ): Promise<void> {
    try {
      const crudo = await this.docker.getLogs(containerId);
      if (!crudo.trim()) return;

      const limpio = secretValues.reduce((texto, valor) => texto.split(valor).join('***'), crudo);

      const base = process.env.ARTIFACTS_VOLUME_PATH ?? '/artifacts';
      const dir = path.join(base, executionId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'executor.log'), limpio, 'utf8');

      const SALTO = String.fromCharCode(10);
      const extracto = limpio.trim().split(SALTO).slice(-15).join(SALTO).slice(0, 1500);
      await this.prisma.execution.updateMany({
        where: { id: executionId, errorMessage: null },
        data: {
          errorMessage: `El ejecutor termino con error. Ultimas lineas:${SALTO}${extracto}`,
        },
      });
      this.logger.log(`Logs del ejecutor guardados para ${executionId}`);
    } catch (err) {
      this.logger.warn(`No se pudieron guardar los logs de ${executionId}: ${String(err)}`);
    }
  }

  private async waitForContainerOrAbort(
    containerId: string,
    executionId: string,
  ): Promise<WaitOutcome> {
    const timers: NodeJS.Timeout[] = [];
    let active = true;

    const exitP: Promise<WaitOutcome> = this.docker
      .waitForContainer(containerId)
      .then((r) => ({ exitCode: r.exitCode, aborted: null }));

    const timeoutP = new Promise<WaitOutcome>((resolve) => {
      timers.push(
        setTimeout(() => resolve({ exitCode: null, aborted: 'timeout' }), this.timeoutMs()),
      );
    });

    // Aviso instantaneo por Redis. Se suscribe con su PROPIA conexion: en node-redis un
    // cliente suscrito no puede hacer otra cosa, y compartir el del job lo dejaria mudo.
    let avisoCancelacion: RedisClient | null = null;
    const avisoP = new Promise<WaitOutcome>((resolve) => {
      // Sin REDIS_URL no hay atajo y no se abre nada. Ademas de ser lo correcto, evita que
      // los tests -que no tienen Redis- dejen una conexion colgada impidiendo que jest
      // termine. La cancelacion sigue funcionando por el sondeo.
      if (!process.env.REDIS_URL) return;
      const cliente = createClient({ url: process.env.REDIS_URL });
      avisoCancelacion = cliente;
      cliente
        .connect()
        .then(() =>
          cliente.subscribe(CANAL_CANCELACION, (mensaje: string) => {
            if (mensaje === executionId) resolve({ exitCode: null, aborted: 'cancelled' });
          }),
        )
        .catch((err) => {
          // Sin aviso en vivo se cancela igual, por el sondeo. Se registra y se sigue.
          this.logger.warn(`Sin aviso de cancelacion para ${executionId}: ${String(err)}`);
        });
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
      return await Promise.race([exitP, timeoutP, cancelP, avisoP]);
    } finally {
      active = false;
      timers.forEach(clearTimeout);
      // La conexion del aviso es de este job: se cierra con el o se acumulan una por
      // ejecucion hasta agotar las conexiones de Redis.
      await (avisoCancelacion as RedisClient | null)?.disconnect().catch(() => undefined);
    }
  }

  private async transition(
    publisher: RedisClient,
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void> {
    const data: Record<string, unknown> = { status };
    if (
      (
        [
          ExecutionStatus.COMPLETED,
          ExecutionStatus.FAILED,
          ExecutionStatus.CANCELLED,
        ] as ExecutionStatus[]
      ).includes(status)
    ) {
      data['completedAt'] = new Date();
    }

    // Update condicional atómico: nunca pisa una cancelación del usuario. Con
    // check-then-update una cancelación en la ventana se perdía y el poll de
    // waitForContainerOrAbort ya no veía CANCELLED (el contenedor corría hasta el final).
    // updateMany no lanza P2025: si la fila fue borrada/cancelada, count === 0.
    const { count } = await this.prisma.execution.updateMany({
      where: { id: executionId, status: { not: ExecutionStatus.CANCELLED } },
      data,
    });
    if (count === 0) {
      this.logger.warn(`Execution ${executionId} cancelled/deleted — skipping → ${status}`);
      return;
    }
    await this.publish(publisher, executionId, 'execution:status', { status });
    this.logger.log(`Execution ${executionId} → ${status}`);
  }

  private async failExecution(
    publisher: RedisClient,
    executionId: string,
    message: string,
  ): Promise<void> {
    // Condicional atómico: no pisa una cancelación ni falla una ejecución borrada.
    const { count } = await this.prisma.execution.updateMany({
      where: { id: executionId, status: { not: ExecutionStatus.CANCELLED } },
      data: { status: ExecutionStatus.FAILED, errorMessage: message, completedAt: new Date() },
    });
    if (count === 0) return; // ya cancelada o borrada
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
