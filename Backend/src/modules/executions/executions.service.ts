import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ExecutionStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionResponseDto } from './dto/execution-response.dto';
import { TriggerExecutionDto } from './dto/trigger-execution.dto';
import { EXECUTION_QUEUE, ExecutionJobData } from './queues/execution.queue';

@Injectable()
export class ExecutionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EXECUTION_QUEUE) private readonly queue: Queue,
  ) {}

  async trigger(dto: TriggerExecutionDto, user: JwtPayload): Promise<ExecutionResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId: user.orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const execution = await this.prisma.execution.create({
      data: {
        projectId: dto.projectId,
        triggeredBy: user.sub,
        status: ExecutionStatus.QUEUED,
      },
    });

    const jobData: ExecutionJobData = {
      executionId: execution.id,
      projectId: dto.projectId,
      orgId: user.orgId,
      suiteId: dto.suiteId,
      testId: dto.testId,
    };

    await this.queue.add('run', jobData, {
      jobId: execution.id, // determinista: permite removerlo al cancelar
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    });

    return execution;
  }

  async findAllForOrg(user: JwtPayload): Promise<ExecutionResponseDto[]> {
    return this.prisma.execution.findMany({
      where: { project: { organizationId: user.orgId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findAll(projectId: string, user: JwtPayload): Promise<ExecutionResponseDto[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: user.orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.execution.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: string, user: JwtPayload): Promise<ExecutionResponseDto> {
    const execution = await this.prisma.execution.findFirst({
      where: { id, project: { organizationId: user.orgId } },
    });
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  async findResults(id: string, user: JwtPayload) {
    await this.findById(id, user);
    return this.prisma.executionResult.findMany({
      where: { executionId: id },
      include: { test: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async cancel(id: string, user: JwtPayload): Promise<void> {
    const execution = await this.findById(id, user);

    const cancellable: ExecutionStatus[] = [
      ExecutionStatus.QUEUED,
      ExecutionStatus.PROVISIONING,
      ExecutionStatus.RUNNING,
      ExecutionStatus.COLLECTING,
    ];
    const deletable: ExecutionStatus[] = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.CANCELLED,
    ];

    if (cancellable.includes(execution.status)) {
      // 1) Marcar CANCELLED con update condicional atómico: si la ejecución terminó
      //    entre el findById y aquí, no re-marca una COMPLETED/FAILED como CANCELLED
      //    (antes pisaba su completedAt real). count === 0 = ya no era cancelable.
      await this.prisma.execution.updateMany({
        where: { id, status: { in: cancellable } },
        data: { status: ExecutionStatus.CANCELLED, completedAt: new Date() },
      });
      // 2) Quitar el job de la cola si aún no se ejecuta (si está activo, el worker ya lo verá).
      await this.queue.remove(id).catch(() => undefined);
    } else if (deletable.includes(execution.status)) {
      await this.prisma.execution.delete({ where: { id } });
      await this.queue.remove(id).catch(() => undefined);
    } else {
      throw new BadRequestException(`Cannot remove execution with status ${execution.status}`);
    }
  }
}
