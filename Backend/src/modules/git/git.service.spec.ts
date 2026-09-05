import { NotFoundException } from '@nestjs/common';
import { GitProvider } from '@prisma/client';
import { GitService } from './git.service';

function build() {
  const prisma = {
    test: { findFirst: jest.fn() },
    gitIntegration: { findFirst: jest.fn(), update: jest.fn() },
  };
  const vault = { decrypt: jest.fn(() => 'plain-token') };
  const github = {
    pushFile: jest.fn().mockResolvedValue({ committed: true, commitUrl: 'https://gh/commit/1' }),
  };
  const gitlab = { pushFile: jest.fn().mockResolvedValue({ committed: true }) };
  const service = new GitService(prisma as never, vault as never, github as never, gitlab as never);
  return { prisma, vault, github, gitlab, service };
}

const user = { sub: 'u1', orgId: 'org-1' } as never;

describe('GitService.sync', () => {
  it('lanza si el test no existe en la org', async () => {
    const { prisma, service } = build();
    prisma.test.findFirst.mockResolvedValue(null);
    await expect(service.sync('t1', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza si el test no tiene código generado', async () => {
    const { prisma, service } = build();
    prisma.test.findFirst.mockResolvedValue({ id: 't1', name: 'Login', generatedCode: null });
    await expect(service.sync('t1', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza si no hay integración Git activa', async () => {
    const { prisma, service } = build();
    prisma.test.findFirst.mockResolvedValue({ id: 't1', name: 'Login', generatedCode: 'code' });
    prisma.gitIntegration.findFirst.mockResolvedValue(null);
    await expect(service.sync('t1', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('pushea a GitHub con ruta saneada y actualiza lastSyncedAt', async () => {
    const { prisma, vault, github, service } = build();
    prisma.test.findFirst.mockResolvedValue({
      id: 't1',
      name: 'Iniciar Sesión!',
      generatedCode: 'export const x=1',
    });
    prisma.gitIntegration.findFirst.mockResolvedValue({
      id: 'gi1',
      provider: GitProvider.GITHUB,
      repoUrl: 'https://github.com/acme/repo',
      defaultBranch: 'main',
      syncPath: 'e2e/',
      encryptedToken: 'enc',
    });

    const res = await service.sync('t1', user);

    expect(vault.decrypt).toHaveBeenCalledWith('enc');
    expect(github.pushFile).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'plain-token',
        repoUrl: 'https://github.com/acme/repo',
        branch: 'main',
        filePath: 'e2e/iniciar-sesion.spec.ts',
        content: 'export const x=1',
      }),
    );
    expect(prisma.gitIntegration.update).toHaveBeenCalledWith({
      where: { id: 'gi1' },
      data: { lastSyncedAt: expect.any(Date) },
    });
    expect(res.message).toContain('https://gh/commit/1');
  });

  it('selecciona el proveedor GitLab según la integración', async () => {
    const { prisma, github, gitlab, service } = build();
    prisma.test.findFirst.mockResolvedValue({ id: 't1', name: 'Test', generatedCode: 'code' });
    prisma.gitIntegration.findFirst.mockResolvedValue({
      id: 'gi1',
      provider: GitProvider.GITLAB,
      repoUrl: 'https://gitlab.com/acme/repo',
      defaultBranch: 'main',
      syncPath: 'e2e/',
      encryptedToken: 'enc',
    });

    await service.sync('t1', user);

    expect(gitlab.pushFile).toHaveBeenCalledTimes(1);
    expect(github.pushFile).not.toHaveBeenCalled();
  });
});
