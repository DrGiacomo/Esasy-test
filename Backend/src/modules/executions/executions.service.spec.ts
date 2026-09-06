import { NotFoundException } from '@nestjs/common';
import { ExecutionStatus, MemberRole } from '@prisma/client';
import { ExecutionsService } from './executions.service';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

const user: JwtPayload = { sub: 'user-1', orgId: 'org-1', role: MemberRole.ADMIN };
const otherOrgUser: JwtPayload = { sub: 'user-2', orgId: 'org-2', role: MemberRole.ADMIN };

function buildMocks() {
  const prisma = {
    project: { findFirst: jest.fn() },
    execution: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
    },
    executionResult: { findMany: jest.fn() },
  };
  const queue = {
    add: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const jwt = { sign: jest.fn(() => 'pase-firmado') };
  const service = new ExecutionsService(prisma as never, jwt as never, queue as never);
  return { prisma, queue, service };
}

describe('ExecutionsService — multi-tenant', () => {
  it('trigger: only finds the project scoped to the caller org', async () => {
    const { prisma, queue, service } = buildMocks();
    prisma.project.findFirst.mockResolvedValue({ id: 'proj-1' });
    prisma.execution.create.mockResolvedValue({ id: 'exec-1', status: ExecutionStatus.QUEUED });

    await service.trigger({ projectId: 'proj-1' }, user);

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'proj-1', organizationId: 'org-1' },
    });
    // jobId determinista = id de la ejecución (necesario para poder cancelar)
    expect(queue.add).toHaveBeenCalledWith(
      'run',
      expect.objectContaining({ executionId: 'exec-1', orgId: 'org-1' }),
      expect.objectContaining({ jobId: 'exec-1' }),
    );
  });

  it('trigger: rejects when the project belongs to another org', async () => {
    const { prisma, queue, service } = buildMocks();
    prisma.project.findFirst.mockResolvedValue(null); // no visible para esta org

    await expect(service.trigger({ projectId: 'proj-1' }, otherOrgUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.execution.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('findById: filters by the project org and throws if not owned', async () => {
    const { prisma, service } = buildMocks();
    prisma.execution.findFirst.mockResolvedValue(null);

    await expect(service.findById('exec-1', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.execution.findFirst).toHaveBeenCalledWith({
      where: { id: 'exec-1', project: { organizationId: 'org-1' } },
    });
  });

  it('findAllForOrg: scopes the listing to the caller org', async () => {
    const { prisma, service } = buildMocks();
    prisma.execution.findMany.mockResolvedValue([]);

    await service.findAllForOrg(user);

    expect(prisma.execution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { project: { organizationId: 'org-1' } } }),
    );
  });
});

describe('ExecutionsService — cancel', () => {
  const runningStatuses = [
    ExecutionStatus.QUEUED,
    ExecutionStatus.PROVISIONING,
    ExecutionStatus.RUNNING,
    ExecutionStatus.COLLECTING,
  ];

  it.each(runningStatuses)('marks %s as CANCELLED and removes the queued job', async (status) => {
    const { prisma, queue, service } = buildMocks();
    prisma.execution.findFirst.mockResolvedValue({ id: 'exec-1', status });

    await service.cancel('exec-1', user);

    // Update condicional atómico: solo transiciona si sigue en un estado cancelable.
    expect(prisma.execution.updateMany).toHaveBeenCalledWith({
      where: { id: 'exec-1', status: { in: runningStatuses } },
      data: expect.objectContaining({ status: ExecutionStatus.CANCELLED }),
    });
    expect(queue.remove).toHaveBeenCalledWith('exec-1');
    expect(prisma.execution.delete).not.toHaveBeenCalled();
  });

  const terminalStatuses = [
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CANCELLED,
  ];

  it.each(terminalStatuses)('hard-deletes terminal status %s', async (status) => {
    const { prisma, queue, service } = buildMocks();
    prisma.execution.findFirst.mockResolvedValue({ id: 'exec-1', status });

    await service.cancel('exec-1', user);

    expect(prisma.execution.delete).toHaveBeenCalledWith({ where: { id: 'exec-1' } });
    expect(queue.remove).toHaveBeenCalledWith('exec-1');
    expect(prisma.execution.updateMany).not.toHaveBeenCalled();
  });

  it('cannot cancel an execution owned by another org', async () => {
    const { prisma, service } = buildMocks();
    prisma.execution.findFirst.mockResolvedValue(null); // findById no lo encuentra para esta org

    await expect(service.cancel('exec-1', otherOrgUser)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.execution.updateMany).not.toHaveBeenCalled();
    expect(prisma.execution.delete).not.toHaveBeenCalled();
  });

  it('does not allow queue.remove failures to bubble up', async () => {
    const { prisma, queue, service } = buildMocks();
    prisma.execution.findFirst.mockResolvedValue({ id: 'exec-1', status: ExecutionStatus.RUNNING });
    queue.remove.mockRejectedValue(new Error('job is locked/active'));

    await expect(service.cancel('exec-1', user)).resolves.toBeUndefined();
    expect(prisma.execution.updateMany).toHaveBeenCalled();
  });
});
