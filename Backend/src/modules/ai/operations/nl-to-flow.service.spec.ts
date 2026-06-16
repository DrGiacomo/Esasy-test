import { NotFoundException } from '@nestjs/common';
import { NlToFlowService } from './nl-to-flow.service';

function buildMocks() {
  const ai = { complete: jest.fn() };
  const prisma = { project: { findUniqueOrThrow: jest.fn(), findFirst: jest.fn() } };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new NlToFlowService(ai as never, prisma as never, audit as never);
  return { ai, prisma, audit, service };
}

describe('NlToFlowService — multi-tenant', () => {
  it('rejects a project from another org and never calls the AI provider', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.convert('do x', 'proj-1', 'user-1', 'org-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'proj-1', organizationId: 'org-2' },
    });
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('forces JSON mode and unwraps { steps: [...] } into a plain array', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.project.findFirst.mockResolvedValue({ id: 'proj-1', baseUrl: 'https://app.test' });
    ai.complete.mockResolvedValue({ content: '{"steps":[{"action":"navigate"}]}' });

    const result = await service.convert('go to app', 'proj-1', 'user-1', 'org-1');

    expect(ai.complete).toHaveBeenCalledWith(expect.any(Array), undefined, { json: true });
    expect(result).toEqual([{ action: 'navigate' }]);
  });

  it('throws a clear error when the AI returns malformed JSON', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.project.findFirst.mockResolvedValue({ id: 'proj-1', baseUrl: 'https://app.test' });
    ai.complete.mockResolvedValue({ content: 'not json at all' });

    await expect(service.convert('go', 'proj-1', 'user-1', 'org-1')).rejects.toThrow(/malformed JSON/i);
  });
});
