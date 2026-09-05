import { NotFoundException } from '@nestjs/common';
import { TestStepsService } from './test-steps.service';
import { TestVersionsService } from './test-versions.service';

const user = { sub: 'user-1', orgId: 'org-1', role: 'ADMIN' } as never;

describe('TestVersionsService — multi-tenant', () => {
  function buildMocks() {
    const prisma = {
      test: { findFirst: jest.fn() },
      testVersion: { findMany: jest.fn(), findUnique: jest.fn() },
    };
    const service = new TestVersionsService(prisma as never);
    return { prisma, service };
  }

  it('findAll rechaza un test de otra organización', async () => {
    const { prisma, service } = buildMocks();
    prisma.test.findFirst.mockResolvedValue(null);

    await expect(service.findAll('test-ajeno', user)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.test.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-ajeno', suite: { project: { organizationId: 'org-1' } } },
      }),
    );
    expect(prisma.testVersion.findMany).not.toHaveBeenCalled();
  });

  it('findOne rechaza un test de otra organización sin leer la versión', async () => {
    const { prisma, service } = buildMocks();
    prisma.test.findFirst.mockResolvedValue(null);

    await expect(service.findOne('test-ajeno', 1, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.testVersion.findUnique).not.toHaveBeenCalled();
  });

  it('findOne devuelve la versión cuando el test es de la org', async () => {
    const { prisma, service } = buildMocks();
    prisma.test.findFirst.mockResolvedValue({ id: 'test-1' });
    prisma.testVersion.findUnique.mockResolvedValue({ id: 'v-1', versionNumber: 1 });

    await expect(service.findOne('test-1', 1, user)).resolves.toEqual({
      id: 'v-1',
      versionNumber: 1,
    });
  });
});

describe('TestStepsService.reorder — multi-tenant', () => {
  function buildMocks() {
    const tx = {
      testStep: {
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      test: { findFirst: jest.fn().mockResolvedValue({ id: 'test-1' }) },
      $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
    };
    const versions = { snapshot: jest.fn().mockResolvedValue(undefined) };
    const service = new TestStepsService(prisma as never, versions as never);
    return { prisma, tx, service };
  }

  it('aborta la transacción si un stepId no pertenece al test (evita write cross-tenant)', async () => {
    const { tx, service } = buildMocks();
    tx.testStep.updateMany.mockResolvedValue({ count: 0 }); // el step es de otro test/org

    await expect(
      service.reorder('test-1', { steps: [{ stepId: 'step-ajeno', order: 0 }] }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.testStep.updateMany).toHaveBeenCalledWith({
      where: { id: 'step-ajeno', testId: 'test-1' },
      data: { order: 0 },
    });
  });

  it('reordena cuando todos los steps pertenecen al test', async () => {
    const { tx, service } = buildMocks();
    tx.testStep.updateMany.mockResolvedValue({ count: 1 });

    await service.reorder(
      'test-1',
      {
        steps: [
          { stepId: 's1', order: 1 },
          { stepId: 's2', order: 0 },
        ],
      },
      user,
    );
    expect(tx.testStep.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.testStep.findMany).toHaveBeenCalled();
  });
});
