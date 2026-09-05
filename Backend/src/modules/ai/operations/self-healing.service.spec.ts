import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HealingStatus } from '@prisma/client';
import { SelfHealingService } from './self-healing.service';

function buildMocks() {
  const ai = { complete: jest.fn(), supportsImages: () => false };
  const vision = { complete: jest.fn(), supportsImages: () => true };
  const prisma = {
    testStep: { findFirst: jest.fn(), update: jest.fn() },
    selectorHealingLog: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn((_key: string, def?: unknown) => def) };
  const service = new SelfHealingService(
    ai,
    prisma as never,
    audit as never,
    vision,
    config as never,
  );
  return { ai, vision, prisma, audit, config, service };
}

const goodProposal = JSON.stringify({
  selector: '#new',
  selectorType: 'css',
  confidence: 0.9,
  reasoning: 'looks stable',
});

describe('SelfHealingService.propose — multi-tenant', () => {
  it('rejects a step from another org without calling the AI', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue(null);

    await expect(service.propose('step-1', '<html/>', 'user-1', 'org-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.testStep.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'step-1', test: { suite: { project: { organizationId: 'org-2' } } } },
      }),
    );
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('creates a PENDING_APPROVAL proposal and supersedes previous ones', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: '#old',
      testId: 'test-1',
      confidenceScore: 0.4,
      test: {},
    });
    ai.complete.mockResolvedValue({ content: goodProposal });
    prisma.selectorHealingLog.create.mockResolvedValue({ id: 'log-1' });

    await service.propose('step-1', '<html/>', 'user-1', 'org-1');

    expect(prisma.selectorHealingLog.updateMany).toHaveBeenCalledWith({
      where: { stepId: 'step-1', status: HealingStatus.PENDING_APPROVAL },
      data: { status: HealingStatus.SUPERSEDED },
    });
    expect(prisma.selectorHealingLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposedSelector: '#new',
          status: HealingStatus.PENDING_APPROVAL,
        }),
      }),
    );
  });

  it('rejects an invalid AI proposal (missing selector / confidence)', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: '#old',
      testId: 'test-1',
      test: {},
    });
    ai.complete.mockResolvedValue({ content: '{"reasoning":"no selector here"}' });

    await expect(service.propose('step-1', '<html/>', 'user-1', 'org-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.selectorHealingLog.create).not.toHaveBeenCalled();
  });
});

describe('SelfHealingService.proposeAutomatic', () => {
  const params = (over = {}) => ({
    stepId: 'step-1',
    pageHtml: '<html/>',
    userId: 'user-1',
    orgId: 'org-1',
    ...over,
  });

  it('no crea propuesta si el step no existe o no tiene selector', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue(null);
    expect(await service.proposeAutomatic(params())).toBeNull();

    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: null,
      testId: 't1',
    });
    expect(await service.proposeAutomatic(params())).toBeNull();
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('deduplica: si ya hay una propuesta PENDING no llama a la IA', async () => {
    const { ai, prisma, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: '#old',
      testId: 't1',
    });
    prisma.selectorHealingLog.findFirst.mockResolvedValue({ id: 'log-existing' });

    const res = await service.proposeAutomatic(params());

    expect(res).toEqual({ id: 'log-existing' });
    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('descarta propuestas por debajo del umbral de confianza', async () => {
    const { ai, prisma, config, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: '#old',
      testId: 't1',
    });
    prisma.selectorHealingLog.findFirst.mockResolvedValue(null);
    config.get.mockImplementation((k: string, def?: unknown) =>
      k === 'SELF_HEALING_MIN_CONFIDENCE' ? 0.8 : def,
    );
    ai.complete.mockResolvedValue({ content: JSON.stringify({ selector: '#x', confidence: 0.5 }) });

    const res = await service.proposeAutomatic(params());

    expect(res).toBeNull();
    expect(prisma.selectorHealingLog.create).not.toHaveBeenCalled();
  });

  it('usa el proveedor de visión y adjunta el screenshot cuando hay imagen', async () => {
    const { vision, prisma, config, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: '#old',
      testId: 't1',
      confidenceScore: 0.3,
    });
    prisma.selectorHealingLog.findFirst.mockResolvedValue(null);
    prisma.selectorHealingLog.create.mockResolvedValue({ id: 'log-new' });
    config.get.mockImplementation((_k: string, def?: unknown) => def);
    vision.complete.mockResolvedValue({
      content: JSON.stringify({ selector: '#good', confidence: 0.9, reasoning: 'r' }),
    });

    const res = await service.proposeAutomatic(params({ screenshot: 'data:image/png;base64,AAA' }));

    expect(res).toEqual({ id: 'log-new' });
    const [messages] = vision.complete.mock.calls[0];
    expect(messages[messages.length - 1].images).toEqual(['data:image/png;base64,AAA']);
    expect(prisma.selectorHealingLog.create).toHaveBeenCalled();
  });

  it('nunca lanza: si la IA falla devuelve null', async () => {
    const { ai, prisma, config, service } = buildMocks();
    prisma.testStep.findFirst.mockResolvedValue({
      id: 'step-1',
      action: 'click',
      selector: '#old',
      testId: 't1',
    });
    prisma.selectorHealingLog.findFirst.mockResolvedValue(null);
    config.get.mockImplementation((_k: string, def?: unknown) => def);
    ai.complete.mockRejectedValue(new Error('boom'));

    await expect(service.proposeAutomatic(params())).resolves.toBeNull();
  });
});

describe('SelfHealingService.approve', () => {
  it('rejects a healing log from another org', async () => {
    const { prisma, service } = buildMocks();
    prisma.selectorHealingLog.findFirst.mockResolvedValue(null);

    await expect(service.approve('log-1', 'user-1', 'org-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.selectorHealingLog.findFirst).toHaveBeenCalledWith({
      where: { id: 'log-1', test: { suite: { project: { organizationId: 'org-2' } } } },
    });
    expect(prisma.testStep.update).not.toHaveBeenCalled();
  });

  it('refuses to re-apply a log that is not PENDING_APPROVAL', async () => {
    const { prisma, service } = buildMocks();
    prisma.selectorHealingLog.findFirst.mockResolvedValue({
      id: 'log-1',
      stepId: 'step-1',
      status: HealingStatus.REJECTED,
    });

    await expect(service.approve('log-1', 'user-1', 'org-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.testStep.update).not.toHaveBeenCalled();
  });

  it('applies the proposed selector for a pending log', async () => {
    const { prisma, service } = buildMocks();
    prisma.selectorHealingLog.findFirst.mockResolvedValue({
      id: 'log-1',
      stepId: 'step-1',
      proposedSelector: '#new',
      confidenceAfter: 0.9,
      status: HealingStatus.PENDING_APPROVAL,
    });

    await service.approve('log-1', 'user-1', 'org-1');

    expect(prisma.testStep.update).toHaveBeenCalledWith({
      where: { id: 'step-1' },
      data: { selector: '#new', confidenceScore: 0.9 },
    });
    expect(prisma.selectorHealingLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: HealingStatus.APPROVED }),
      }),
    );
  });
});

describe('SelfHealingService.reject', () => {
  it('rejects a healing log from another org', async () => {
    const { prisma, service } = buildMocks();
    prisma.selectorHealingLog.findFirst.mockResolvedValue(null);

    await expect(service.reject('log-1', 'user-1', 'org-2', 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.selectorHealingLog.update).not.toHaveBeenCalled();
  });

  it('no permite rechazar un log que no está PENDING_APPROVAL', async () => {
    const { prisma, service } = buildMocks();
    prisma.selectorHealingLog.findFirst.mockResolvedValue({
      id: 'log-1',
      stepId: 'step-1',
      status: HealingStatus.APPROVED,
    });

    // Sin la validación se marcaba REJECTED dejando el selector ya aplicado (inconsistente).
    await expect(service.reject('log-1', 'user-1', 'org-1', 'nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.selectorHealingLog.update).not.toHaveBeenCalled();
  });

  it('rechaza un log pendiente', async () => {
    const { prisma, service } = buildMocks();
    prisma.selectorHealingLog.findFirst.mockResolvedValue({
      id: 'log-1',
      stepId: 'step-1',
      status: HealingStatus.PENDING_APPROVAL,
    });

    await service.reject('log-1', 'user-1', 'org-1', 'nope');

    expect(prisma.selectorHealingLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: HealingStatus.REJECTED }),
      }),
    );
  });
});
