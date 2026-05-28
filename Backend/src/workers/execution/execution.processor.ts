import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ExecutionStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { createClient } from 'redis';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionJobData, EXECUTION_QUEUE } from '../../modules/executions/queues/execution.queue';
import { DockerService } from './docker.service';
import { ArtifactCollectorService } from './artifact-collector.service';

@Processor(EXECUTION_QUEUE)
export class ExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionProcessor.name);
  private publisher: ReturnType<typeof createClient>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly docker: DockerService,
    private readonly artifacts: ArtifactCollectorService,
  ) {
    super();
  }

  async process(job: Job<ExecutionJobData>): Promise<void> {
    const { executionId, projectId, orgId, suiteId, testId } = job.data;

    this.publisher = createClient({ url: process.env.REDIS_URL });
    await this.publisher.connect();

    try {
      await this.transition(executionId, ExecutionStatus.PROVISIONING);

      // Obtener tests a ejecutar
      const tests = await this.getTests(projectId, suiteId, testId);
      if (tests.length === 0) {
        await this.transition(executionId, ExecutionStatus.COMPLETED);
        return;
      }

      // Crear un ExecutionResult por cada test (el executor los lee para saber qué ejecutar)
      for (const test of tests) {
        await this.prisma.executionResult.create({
          data: { executionId, testId: test.id, status: ExecutionStatus.RUNNING },
        });
      }

      // Lanzar contenedor Docker con los datos de la ejecución
      const envVars = [
        `EXECUTION_ID=${executionId}`,
        `PROJECT_ID=${projectId}`,
        `ORG_ID=${orgId}`,
        `REDIS_URL=${process.env.CONTAINER_REDIS_URL ?? process.env.REDIS_URL}`,
        `DATABASE_URL=${process.env.CONTAINER_DATABASE_URL ?? process.env.DATABASE_URL}`,
      ];

      const containerId = await this.docker.runExecutionContainer(executionId, envVars);
      await this.prisma.execution.update({
        where: { id: executionId },
        data: { dockerContainerId: containerId, startedAt: new Date() },
      });

      await this.transition(executionId, ExecutionStatus.RUNNING);

      const { exitCode } = await this.docker.waitForContainer(containerId);

      await this.transition(executionId, ExecutionStatus.COLLECTING);

      // Recopilar artefactos de cada resultado
      const results = await this.prisma.executionResult.findMany({
        where: { executionId },
      });

      for (const result of results) {
        const urls = this.artifacts.getArtifactUrls(executionId, result.testId);
        await this.prisma.executionResult.update({
          where: { id: result.id },
          data: urls,
        });
      }

      await this.docker.stopAndRemove(containerId);

      const finalStatus = exitCode === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
      await this.transition(executionId, finalStatus);
    } catch (err) {
      this.logger.error(`Execution ${executionId} failed: ${String(err)}`);
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: String(err),
          completedAt: new Date(),
        },
      });
      await this.publish(executionId, 'execution:error', { message: String(err) });
    } finally {
      await this.publisher.disconnect();
    }
  }

  private async transition(executionId: string, status: ExecutionStatus): Promise<void> {
    const data: Record<string, unknown> = { status };
    if (([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED] as ExecutionStatus[]).includes(status)) {
      data['completedAt'] = new Date();
    }
    await this.prisma.execution.update({ where: { id: executionId }, data });
    await this.publish(executionId, 'execution:status', { status });
    this.logger.log(`Execution ${executionId} → ${status}`);
  }

  private async publish(executionId: string, event: string, payload: object): Promise<void> {
    await this.publisher.publish(
      `execution:${executionId}:events`,
      JSON.stringify({ event, executionId, ...payload, timestamp: Date.now() }),
    );
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
