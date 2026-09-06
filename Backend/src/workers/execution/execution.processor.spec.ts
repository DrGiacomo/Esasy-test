import { ExecutionStatus, SecretType } from '@prisma/client';
import { ExecutionProcessor } from './execution.processor';

type WaitOutcome = { exitCode: number | null; aborted: 'cancelled' | 'timeout' | null };

type RedisPublisher = { publish: jest.Mock };

type ProcessorInternals = {
  getSecretEnvVars(orgId: string, executionId: string): Promise<string[]>;
  waitForContainerOrAbort(containerId: string, executionId: string): Promise<WaitOutcome>;
  transition(
    publisher: RedisPublisher,
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void>;
  failExecution(publisher: RedisPublisher, executionId: string, message: string): Promise<void>;
  guardarLogsDelFallo(
    executionId: string,
    containerId: string,
    secretValues: string[],
  ): Promise<void>;
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

describe('ExecutionProcessor — transiciones de estado atómicas', () => {
  function buildState() {
    const prisma = {
      execution: { updateMany: jest.fn() },
      executionResult: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const processor = new ExecutionProcessor(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const publisher: RedisPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    return { prisma, publisher, processor: processor as unknown as ProcessorInternals };
  }

  it('transition no publica si el update condicional no afecta filas (cancelada/borrada)', async () => {
    const { prisma, publisher, processor } = buildState();
    prisma.execution.updateMany.mockResolvedValue({ count: 0 });

    await processor.transition(publisher, 'exec-1', ExecutionStatus.RUNNING);

    // El where excluye CANCELLED: nunca pisa una cancelación del usuario.
    expect(prisma.execution.updateMany).toHaveBeenCalledWith({
      where: { id: 'exec-1', status: { not: ExecutionStatus.CANCELLED } },
      data: expect.objectContaining({ status: ExecutionStatus.RUNNING }),
    });
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('transition publica cuando el update sí transiciona', async () => {
    const { prisma, publisher, processor } = buildState();
    prisma.execution.updateMany.mockResolvedValue({ count: 1 });

    await processor.transition(publisher, 'exec-1', ExecutionStatus.COMPLETED);

    expect(publisher.publish).toHaveBeenCalled();
  });

  it('failExecution no pisa una ejecución cancelada y no toca sus resultados', async () => {
    const { prisma, publisher, processor } = buildState();
    prisma.execution.updateMany.mockResolvedValue({ count: 0 });

    await processor.failExecution(publisher, 'exec-1', 'boom');

    expect(prisma.executionResult.updateMany).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('failExecution marca los executionResult en RUNNING como FAILED', async () => {
    const { prisma, publisher, processor } = buildState();
    prisma.execution.updateMany.mockResolvedValue({ count: 1 });

    await processor.failExecution(publisher, 'exec-1', 'boom');

    expect(prisma.executionResult.updateMany).toHaveBeenCalledWith({
      where: { executionId: 'exec-1', status: ExecutionStatus.RUNNING },
      data: { status: ExecutionStatus.FAILED },
    });
    expect(publisher.publish).toHaveBeenCalled();
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

/**
 * Guardar los logs del contenedor es lo que separa "fallo la prueba del usuario" de "fallo
 * el motor". Pero esos logs pueden llevar dentro los secretos que se inyectaron: un secreto
 * que acaba en cualquier registro ya es publico (`C4`). Por eso lo que se prueba aqui no es
 * que guarde, sino que guarde TAPADO.
 */
describe('ExecutionProcessor — logs del fallo con los secretos tapados', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const os = jest.requireActual<typeof import('os')>('os');
  const path = jest.requireActual<typeof import('path')>('path');

  function build(logs: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'et-logs-'));
    process.env.ARTIFACTS_VOLUME_PATH = dir;
    const prisma = { execution: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const docker = { getLogs: jest.fn().mockResolvedValue(logs) };
    const processor = new ExecutionProcessor(
      prisma as never,
      docker as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { dir, prisma, docker, processor: processor as unknown as ProcessorInternals };
  }

  it('tapa el valor del secreto en el archivo y en el mensaje de error', async () => {
    const SECRETO = 'sk-clave-de-verdad-1234';
    const { dir, prisma, processor } = build(
      `[executor] arrancando${String.fromCharCode(10)}Authorization: ${SECRETO}${String.fromCharCode(10)}fallo`,
    );

    await processor.guardarLogsDelFallo('exec-1', 'cont-1', [SECRETO]);

    const guardado = fs.readFileSync(path.join(dir, 'exec-1', 'executor.log'), 'utf8');
    expect(guardado).not.toContain(SECRETO);
    expect(guardado).toContain('***');

    const mensaje = prisma.execution.updateMany.mock.calls[0][0].data.errorMessage as string;
    expect(mensaje).not.toContain(SECRETO);
    expect(mensaje).toContain('El ejecutor termino con error');
  });

  it('no escribe nada si el contenedor no dijo nada', async () => {
    const { dir, prisma, processor } = build('   ');
    await processor.guardarLogsDelFallo('exec-2', 'cont-2', []);
    expect(fs.existsSync(path.join(dir, 'exec-2', 'executor.log'))).toBe(false);
    expect(prisma.execution.updateMany).not.toHaveBeenCalled();
  });

  it('no revienta la ejecucion si no se pueden leer los logs', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'et-logs-'));
    process.env.ARTIFACTS_VOLUME_PATH = dir;
    const docker = { getLogs: jest.fn().mockRejectedValue(new Error('boom')) };
    const processor = new ExecutionProcessor(
      { execution: { updateMany: jest.fn() } } as never,
      docker as never,
      {} as never,
      {} as never,
      {} as never,
    ) as unknown as ProcessorInternals;

    await expect(processor.guardarLogsDelFallo('exec-3', 'cont-3', [])).resolves.toBeUndefined();
  });
});
