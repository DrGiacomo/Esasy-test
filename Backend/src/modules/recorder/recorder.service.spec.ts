import { NotFoundException } from '@nestjs/common';
import { RecorderService } from './recorder.service';

function build() {
  const prisma = {
    recording: { findUnique: jest.fn(), delete: jest.fn() },
    testSuite: { findFirst: jest.fn() },
    project: { findFirst: jest.fn() },
    test: { create: jest.fn() },
    testStep: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = { get: jest.fn() };
  const jwt = { sign: jest.fn() };
  const service = new RecorderService(config as never, prisma as never, jwt as never);
  return { prisma, service };
}

describe('RecorderService.start — multi-tenant', () => {
  const user = { sub: 'u1', orgId: 'org-1', role: 'ADMIN' } as never;

  it('rechaza un projectId de otra org sin provisionar el contenedor', async () => {
    const { prisma, service } = build();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.start('proj-ajeno', 'http://x', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proj-ajeno', organizationId: 'org-1' },
      }),
    );
  });
});

describe('RecorderService.getRecording', () => {
  it('lanza si la grabación no existe o es de otra org', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue(null);
    await expect(service.getRecording('r1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);

    prisma.recording.findUnique.mockResolvedValue({ id: 'r1', orgId: 'org-2' });
    await expect(service.getRecording('r1', 'org-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devuelve la grabación de la org correcta', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({ id: 'r1', orgId: 'org-1' });
    await expect(service.getRecording('r1', 'org-1')).resolves.toEqual({
      id: 'r1',
      orgId: 'org-1',
    });
  });
});

describe('RecorderService.convertToTest', () => {
  it('lanza si la suite no pertenece a la org', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({
      id: 'r1',
      orgId: 'org-1',
      targetUrl: 'http://x',
      steps: [],
    });
    prisma.testSuite.findFirst.mockResolvedValue(null);
    await expect(service.convertToTest('r1', 'suite-1', 'My Test', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('colapsa typing consecutivo, deduplica navigates y conserva selectorType', async () => {
    const { prisma, service } = build();
    prisma.recording.findUnique.mockResolvedValue({
      id: 'r1',
      orgId: 'org-1',
      targetUrl: 'http://x',
      steps: [
        { type: 'navigate', url: 'http://x' },
        { type: 'navigate', url: 'http://x' }, // duplicado → se descarta
        { type: 'click', selector: '[data-testid="login"]', selectorType: 'testId' },
        { type: 'type', value: 'he' },
        { type: 'type', value: 'llo' }, // se fusiona con el anterior
      ],
    });
    prisma.testSuite.findFirst.mockResolvedValue({ id: 'suite-1' });
    prisma.test.create.mockResolvedValue({ id: 'test-1' });

    const tx = {
      test: { create: prisma.test.create },
      testStep: { create: prisma.testStep.create },
    };
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    await service.convertToTest('r1', 'suite-1', 'My Test', 'org-1');

    // navigate (1) + click (1) + type fusionado (1) = 3 steps
    expect(prisma.testStep.create).toHaveBeenCalledTimes(3);

    const created = prisma.testStep.create.mock.calls.map((c) => c[0].data);
    expect(created[0]).toMatchObject({ order: 0, action: 'navigate', value: 'http://x' });
    expect(created[1]).toMatchObject({
      order: 1,
      action: 'click',
      selector: '[data-testid="login"]',
      selectorType: 'testId',
    });
    expect(created[2]).toMatchObject({ order: 2, action: 'fill', value: 'hello' });
  });
});
