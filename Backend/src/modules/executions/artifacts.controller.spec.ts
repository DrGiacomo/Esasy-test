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

/**
 * El pase que emite `GET /executions/:id/artifact-token`: sirve para UNA ejecución y es lo
 * único que se admite por la dirección desde el 2026-09-05. Antes viajaba ahí el token de
 * sesión entero, y una dirección acaba en los logs.
 */
const paseDe = (executionId: string) => ({ kind: 'artifact', executionId, orgId: 'org-1' });

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
    jwt.verify.mockReturnValue(paseDe('exec-ajena'));
    prisma.execution.findFirst.mockResolvedValue(null);

    await expect(
      controller.serve('exec-ajena', 'test_final.png', 'pase', req as never, res as never),
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
    jwt.verify.mockReturnValue(paseDe('exec-1'));

    await expect(
      controller.serve('exec-1', '..%2F..%2Fetc', 'pase', req as never, res as never),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.execution.findFirst).not.toHaveBeenCalled();
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('sirve el archivo cuando el usuario es dueño de la ejecución', async () => {
    const { controller, jwt, prisma, req, res } = buildMocks();
    jwt.verify.mockReturnValue(paseDe('exec-1'));
    prisma.execution.findFirst.mockResolvedValue({ id: 'exec-1' });

    await controller.serve('exec-1', 'test_final.png', 'pase', req as never, res as never);
    expect(res.sendFile).toHaveBeenCalledWith(
      expect.stringContaining('exec-1'),
      expect.any(Function),
    );
  });
});

/**
 * Lo que cambió el 2026-09-05 y no puede volver atrás: la credencial que vale depende de POR
 * DÓNDE llega. Un token de sesión en la dirección es la cuenta entera escrita en el log de
 * nginx, en el historial del navegador y en cualquier intermediario.
 */
describe('ArtifactsController — de dónde viene la credencial', () => {
  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('rechaza el token de USUARIO cuando llega por la dirección', async () => {
    const { controller, jwt, req, res } = buildMocks();
    jwt.verify.mockReturnValue(userPayload); // token válido de usuario
    await expect(
      controller.serve('exec-1', 'v.webm', 'token-de-sesion', req as never, res as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('acepta el token de usuario por cabecera', async () => {
    const { controller, jwt, prisma, res } = buildMocks();
    jwt.verify.mockReturnValue(userPayload);
    prisma.execution.findFirst.mockResolvedValue({ id: 'exec-1' });
    const conCabecera = { headers: { authorization: 'Bearer token-de-sesion' } };
    await controller.serve('exec-1', 'v.webm', undefined, conCabecera as never, res as never);
    expect(res.sendFile).toHaveBeenCalled();
  });

  it('rechaza un pase emitido para OTRA ejecución', async () => {
    const { controller, jwt, req, res } = buildMocks();
    jwt.verify.mockReturnValue(paseDe('exec-otra'));
    await expect(
      controller.serve('exec-1', 'v.webm', 'pase-ajeno', req as never, res as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
