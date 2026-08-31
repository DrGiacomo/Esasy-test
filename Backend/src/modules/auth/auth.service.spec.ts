import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function build() {
  const prisma = {
    user: { findUnique: jest.fn() },
    refreshToken: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    membership: { findUnique: jest.fn(), findFirst: jest.fn() },
  };
  const jwt = { sign: jest.fn().mockReturnValue('access-token') };
  const config = { get: jest.fn((_k: string, def?: unknown) => def) };
  const service = new AuthService(prisma as never, jwt as never, config as never);
  return { prisma, jwt, service };
}

const activeToken = {
  id: 'rt-1',
  userId: 'u1',
  organizationId: 'org-1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 3_600_000),
};

describe('AuthService.refresh', () => {
  it('rechaza el refresh de un usuario desactivado', async () => {
    const { prisma, service } = build();
    prisma.refreshToken.findUnique.mockResolvedValue(activeToken);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false });

    await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    // No debe rotar el token de un usuario inactivo.
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('reissue mantiene la org del token, no la membresía más antigua', async () => {
    const { prisma, service } = build();
    prisma.refreshToken.findUnique.mockResolvedValue(activeToken);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
    prisma.membership.findUnique.mockResolvedValue({ organizationId: 'org-1', role: 'EDITOR' });

    await service.refresh('raw');

    // Se resuelve por la org del token (findUnique), no por findFirst (más antigua).
    expect(prisma.membership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_organizationId: { userId: 'u1', organizationId: 'org-1' } },
      }),
    );
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
    // El nuevo refresh token persiste la misma org.
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-1' }) }),
    );
  });

  it('token legacy sin org recae en la membresía más antigua', async () => {
    const { prisma, service } = build();
    prisma.refreshToken.findUnique.mockResolvedValue({ ...activeToken, organizationId: null });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
    prisma.membership.findFirst.mockResolvedValue({ organizationId: 'org-old', role: 'ADMIN' });

    await service.refresh('raw');

    expect(prisma.membership.findFirst).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-old' }) }),
    );
  });
});
