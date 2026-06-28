import { ExecutionStatus, SecretType } from '@prisma/client';
import { ExecutionProcessor } from './execution.processor';

type WaitOutcome = { exitCode: number | null; aborted: 'cancelled' | 'timeout' | null };

type ProcessorInternals = {
  getSecretEnvVars(orgId: string, executionId: string): Promise<string[]>;
  waitForContainerOrAbort(containerId: string, executionId: string): Promise<WaitOutcome>;
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
    {} as never, // autoHealing — idem
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

describe('ExecutionProcessor — ciclo de vida y cancelación del contenedor', () => {
  const NEVER = new Promise<{ exitCode: number }>(() => {}); // contenedor que no termina

  function buildLifecycle() {
    const prisma = { execution: { findUnique: jest.fn() } };
    const docker = { waitForContainer: jest.fn() };
    const processor = new ExecutionProcessor(
      prisma as never,
      docker as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { prisma, docker, processor: processor as unknown as ProcessorInternals };
  }

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.EXECUTION_TIMEOUT_MS;
  });

  it('devuelve el exitCode cuando el contenedor termina normalmente', async () => {
    const { docker, processor } = buildLifecycle();
    docker.waitForContainer.mockResolvedValue({ exitCode: 0 });

    await expect(processor.waitForContainerOrAbort('c1', 'exec-1')).resolves.toEqual({
      exitCode: 0,
      aborted: null,
    });
  });

  it('aborta como "cancelled" cuando la ejecución pasa a CANCELLED en BD', async () => {
    jest.useFakeTimers();
    const { prisma, docker, processor } = buildLifecycle();
    docker.waitForContainer.mockReturnValue(NEVER);
    prisma.execution.findUnique.mockResolvedValue({ status: ExecutionStatus.CANCELLED });

    const p = processor.waitForContainerOrAbort('c1', 'exec-1');
    await jest.advanceTimersByTimeAsync(3000); // primer poll de cancelación

    await expect(p).resolves.toEqual({ exitCode: null, aborted: 'cancelled' });
  });

  it('aborta como "timeout" al superar EXECUTION_TIMEOUT_MS', async () => {
    jest.useFakeTimers();
    process.env.EXECUTION_TIMEOUT_MS = '100';
    const { prisma, docker, processor } = buildLifecycle();
    docker.waitForContainer.mockReturnValue(NEVER);
    prisma.execution.findUnique.mockResolvedValue({ status: ExecutionStatus.RUNNING });

    const p = processor.waitForContainerOrAbort('c1', 'exec-1');
    await jest.advanceTimersByTimeAsync(150);

    await expect(p).resolves.toEqual({ exitCode: null, aborted: 'timeout' });
  });
});
