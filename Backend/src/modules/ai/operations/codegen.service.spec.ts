import { NotFoundException } from '@nestjs/common';
import { CodegenService } from './codegen.service';

function buildMocks() {
  const ai = { complete: jest.fn() };
  const prisma = { test: { findFirst: jest.fn(), update: jest.fn() } };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new CodegenService(ai as never, prisma as never, audit as never);
  return { ai, prisma, audit, service };
}

describe('CodegenService — multi-tenant', () => {
  it('scopes the test to the caller org and rejects cross-org access', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.test.findFirst.mockResolvedValue(null);

    await expect(service.generate('test-1', 'user-1', 'org-2')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.test.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-1', suite: { project: { organizationId: 'org-2' } } },
      }),
    );
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('generates and persists code for an owned test', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.test.findFirst.mockResolvedValue({ id: 'test-1', name: 'Login', flowModel: {}, steps: [] });
    ai.complete.mockResolvedValue({ content: 'await page.goto("/")' });

    const code = await service.generate('test-1', 'user-1', 'org-1');

    expect(code).toBe('await page.goto("/")');
    expect(prisma.test.update).toHaveBeenCalledWith({
      where: { id: 'test-1' },
      data: { generatedCode: 'await page.goto("/")' },
    });
  });
});
