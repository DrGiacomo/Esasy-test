import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import { ArtifactsController } from './artifacts.controller';

jest.mock('fs');

function buildMocks() {
  const prisma = { execution: { findFirst: jest.fn() } };
  const jwt = { verify: jest.fn() };
  const config = { get: jest.fn((_key: string, def?: unknown) => def) };
  const controller = new ArtifactsController(prisma as never, jwt as never, config as never);
  const res = { sendFile: jest.fn((_p: string, cb: (err?: Error) => void) => cb()) };
  const req = { headers: {} };
  return { prisma, jwt, config, controller, res, req };
}

const userPayload = { sub: 'user-1', orgId: 'org-1', role: 'ADMIN' };

describe('ArtifactsController — auth y multi-tenant', () => {
  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('rechaza la petición sin token (los estáticos antiguos servían a cualquiera)', async () => {
    const { controller, req, res } = buildMocks();
    await expect(
      controller.serve('exec-1', 'test_final.png', undefined, req as never, res as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token inválido', async () => {
    const { controller, jwt, req, res } = buildMocks();
    jwt.verify.mockImplementation(() => {
      throw new Error('bad token');
    });
    await expect(
      controller.serve('exec-1', 'test_final.png', 'bogus', req as never, res as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza el token de sesión del recorder (kind=recorder)', async () => {
    const { controller, jwt, req, res } = buildMocks();
    jwt.verify.mockReturnValue({ kind: 'recorder', sessionId: 's-1' });
    await expect(
      controller.serve('exec-1', 'test_final.png', 'recorder-token', req as never, res as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('devuelve 404 si la ejecución pertenece a otra organización', async () => {
    const { controller, jwt, prisma, req, res } = buildMocks();
    jwt.verify.mockReturnValue(userPayload);
    prisma.execution.findFirst.mockResolvedValue(null);

    await expect(
      controller.serve('exec-ajena', 'test_final.png', 'token', req as never, res as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.execution.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-ajena', project: { organizationId: 'org-1' } },
      }),
    );
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('rechaza nombres de archivo con path traversal sin tocar el disco', async () => {
    const { controller, jwt, prisma, req, res } = buildMocks();
    jwt.verify.mockReturnValue(userPayload);

    await expect(
      controller.serve('exec-1', '..%2F..%2Fetc', 'token', req as never, res as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.execution.findFirst).not.toHaveBeenCalled();
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('sirve el archivo cuando el usuario es dueño de la ejecución', async () => {
    const { controller, jwt, prisma, req, res } = buildMocks();
    jwt.verify.mockReturnValue(userPayload);
    prisma.execution.findFirst.mockResolvedValue({ id: 'exec-1' });

    await controller.serve('exec-1', 'test_final.png', 'token', req as never, res as never);
    expect(res.sendFile).toHaveBeenCalledWith(
      expect.stringContaining('exec-1'),
      expect.any(Function),
    );
  });
});
