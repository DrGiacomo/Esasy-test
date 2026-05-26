import { Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutionReport(executionId: string, user: JwtPayload) {
    const execution = await this.prisma.execution.findFirst({
      where: { id: executionId, project: { organizationId: user.orgId } },
      include: {
        project: { select: { id: true, name: true, baseUrl: true } },
        results: {
          include: {
            test: { select: { id: true, name: true } },
            stepResults: {
              include: { step: { select: { id: true, order: true, action: true, description: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!execution) throw new NotFoundException('Execution not found');

    const passed = execution.results.filter((r) => r.status === 'COMPLETED').length;
    const failed = execution.results.filter((r) => r.status === 'FAILED').length;
    const totalDuration = execution.results.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);

    return {
      executionId: execution.id,
      project: execution.project,
      status: execution.status,
      triggeredBy: execution.triggeredBy,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      summary: { total: execution.results.length, passed, failed, totalDurationMs: totalDuration },
      results: execution.results,
    };
  }
}
