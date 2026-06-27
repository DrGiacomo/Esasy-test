import { SecretType } from '@prisma/client';
import { ExecutionProcessor } from './execution.processor';

type ProcessorInternals = {
  getSecretEnvVars(orgId: string, executionId: string): Promise<string[]>;
};

function buildProcessor() {
  const prisma = {
    secret: { findMany: jest.fn() },
  };
  const vault = {
    decrypt: jest.fn((c: string) => `dec(${c})`),
  };
  const processor = new ExecutionProcessor(
    prisma as never,
    {} as never, // docker — no usado por getSecretEnvVars
    {} as never, // artifacts — idem
    vault as never,
  );
  return { prisma, vault, processor: processor as unknown as ProcessorInternals };
}

describe('ExecutionProcessor — inyección de secretos', () => {
  it('descifra solo los secretos ENV_VAR de la org y los formatea como NAME=value', async () => {
    const { prisma, vault, processor } = buildProcessor();
    prisma.secret.findMany.mockResolvedValue([
      { name: 'LOGIN_USER', encryptedValue: 'c1' },
      { name: 'LOGIN_PASS', encryptedValue: 'c2' },
    ]);

    const env = await processor.getSecretEnvVars('org-1', 'exec-1');

    expect(prisma.secret.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', type: SecretType.ENV_VAR },
      select: { name: true, encryptedValue: true },
    });
    expect(vault.decrypt).toHaveBeenCalledTimes(2);
    expect(env).toEqual(['LOGIN_USER=dec(c1)', 'LOGIN_PASS=dec(c2)']);
  });

  it('omite secretos cuyo nombre pisa una env reservada del runtime', async () => {
    const { prisma, processor } = buildProcessor();
    prisma.secret.findMany.mockResolvedValue([
      { name: 'DATABASE_URL', encryptedValue: 'evil' },
      { name: 'API_TOKEN', encryptedValue: 'c1' },
    ]);

    const env = await processor.getSecretEnvVars('org-1', 'exec-1');

    expect(env).toEqual(['API_TOKEN=dec(c1)']);
  });

  it('un secreto corrupto no aborta la ejecución; se omite y sigue con el resto', async () => {
    const { prisma, vault, processor } = buildProcessor();
    prisma.secret.findMany.mockResolvedValue([
      { name: 'BAD', encryptedValue: 'broken' },
      { name: 'GOOD', encryptedValue: 'c2' },
    ]);
    vault.decrypt.mockImplementation((c: string) => {
      if (c === 'broken') throw new Error('auth tag mismatch');
      return `dec(${c})`;
    });

    const env = await processor.getSecretEnvVars('org-1', 'exec-1');

    expect(env).toEqual(['GOOD=dec(c2)']);
  });

  it('sin secretos devuelve una lista vacía', async () => {
    const { prisma, processor } = buildProcessor();
    prisma.secret.findMany.mockResolvedValue([]);

    expect(await processor.getSecretEnvVars('org-1', 'exec-1')).toEqual([]);
  });
});
