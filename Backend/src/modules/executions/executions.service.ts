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
    };

    await this.queue.add('run', jobData, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    });

    return execution;
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
    ];
    if (!cancellable.includes(execution.status)) {
      throw new BadRequestException(`Cannot cancel execution with status ${execution.status}`);
    }

    await this.prisma.execution.update({
      where: { id },
      data: { status: ExecutionStatus.CANCELLED, completedAt: new Date() },
    });
  }
}
