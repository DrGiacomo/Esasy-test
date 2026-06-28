import * as fs from 'fs';
import { AutoHealingService } from './auto-healing.service';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

function build() {
  const prisma = {
    stepResult: { findMany: jest.fn() },
    execution: { findUnique: jest.fn() },
  };
  const config = { get: jest.fn((_k: string, def?: unknown) => def) };
  const selfHealing = { proposeAutomatic: jest.fn().mockResolvedValue({ id: 'log' }) };
  const service = new AutoHealingService(prisma as never, config as never, selfHealing as never);
  return { prisma, config, selfHealing, service };
}

describe('AutoHealingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no hace nada si AUTO_HEALING_ENABLED es false', async () => {
    const { prisma, config, service } = build();
    config.get.mockImplementation((k: string, def?: unknown) => (k === 'AUTO_HEALING_ENABLED' ? false : def));

    await service.run('exec-1', 'org-1');

    expect(prisma.stepResult.findMany).not.toHaveBeenCalled();
  });

  it('no llama al self-healing si no hay steps fallidos', async () => {
    const { prisma, selfHealing, service } = build();
    prisma.stepResult.findMany.mockResolvedValue([]);

    await service.run('exec-1', 'org-1');

    expect(selfHealing.proposeAutomatic).not.toHaveBeenCalled();
  });

  it('por cada step fallido con HTML dispara una propuesta automática', async () => {
    const { prisma, selfHealing, service } = build();
    prisma.stepResult.findMany.mockResolvedValue([{ stepId: 's1' }, { stepId: 's2' }]);
    prisma.execution.findUnique.mockResolvedValue({ triggeredBy: 'user-1' });
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation((p: never) =>
      String(p).endsWith('.html') ? '<html/>' : (Buffer.from('img') as never),
    );

    await service.run('exec-1', 'org-1');

    expect(selfHealing.proposeAutomatic).toHaveBeenCalledTimes(2);
    expect(selfHealing.proposeAutomatic).toHaveBeenCalledWith(
      expect.objectContaining({
        stepId: 's1',
        pageHtml: '<html/>',
        userId: 'user-1',
        orgId: 'org-1',
        screenshot: expect.stringContaining('data:image/png;base64,'),
      }),
    );
  });

  it('omite steps sin HTML de fallo', async () => {
    const { prisma, selfHealing, service } = build();
    prisma.stepResult.findMany.mockResolvedValue([{ stepId: 's1' }]);
    prisma.execution.findUnique.mockResolvedValue({ triggeredBy: 'user-1' });
    mockedFs.existsSync.mockReturnValue(false);

    await service.run('exec-1', 'org-1');

    expect(selfHealing.proposeAutomatic).not.toHaveBeenCalled();
  });

  it('omite si la ejecución no tiene triggeredBy', async () => {
    const { prisma, selfHealing, service } = build();
    prisma.stepResult.findMany.mockResolvedValue([{ stepId: 's1' }]);
    prisma.execution.findUnique.mockResolvedValue(null);

    await service.run('exec-1', 'org-1');

    expect(selfHealing.proposeAutomatic).not.toHaveBeenCalled();
  });
});
