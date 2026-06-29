import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Docker from 'dockerode';
import { randomUUID } from 'crypto';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { RecorderSession, CapturedStep } from './recorder-session';

interface MappedStep {
  action: string;
  selector?: string;
  selectorType?: string;
  value?: string;
  description?: string;
}

@Injectable()
export class RecorderService implements OnModuleDestroy {
  private readonly logger = new Logger(RecorderService.name);
  private readonly docker = new Docker(
    process.platform === 'win32'
      ? { socketPath: '//./pipe/dockerDesktopLinuxEngine' }
      : { socketPath: '/var/run/docker.sock' },
  );
  private readonly sessions = new Map<string, RecorderSession>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async start(projectId: string, targetUrl: string, user: JwtPayload): Promise<RecorderSession> {
    const sessionId = randomUUID();
    const image = this.config.get<string>('RECORDER_IMAGE')!;
    const network = this.config.get<string>('DOCKER_NETWORK')!;

    const images = await this.docker.listImages({ filters: { reference: [image] } });
    if (images.length === 0) {
      throw new Error(`Docker image "${image}" not found. Run: docker compose --profile build-images build`);
    }

    // Token de sesión firmado para que el contenedor se autentique en el gateway WS.
    // Solo da acceso a ESTA sesión, nunca a datos de la organización.
    const recorderToken = this.jwt.sign(
      { kind: 'recorder', sessionId },
      { expiresIn: '31m' }, // un poco más que el auto-expire de 30 min
    );

    const container = await this.docker.createContainer({
      name: `recorder-${sessionId}`,
      Image: image,
      Env: [
        `SESSION_ID=${sessionId}`,
        `TARGET_URL=${targetUrl}`,
        `BACKEND_WS_URL=ws://host.docker.internal:3000`,
        `RECORDER_TOKEN=${recorderToken}`,
      ],
      HostConfig: { NetworkMode: network, AutoRemove: false, ShmSize: 256 * 1024 * 1024 },
    });

    await container.start();

    const session: RecorderSession = {
      sessionId,
      projectId,
      orgId: user.orgId,
      containerId: container.id,
      targetUrl,
      startedAt: new Date(),
      status: 'ACTIVE',
      steps: [],
    };

    session.expireTimer = setTimeout(() => void this.expire(sessionId), 30 * 60 * 1000);
    // Persistencia incremental: vuelca los pasos cada 10s. Si el backend cae antes de
    // stop(), la grabación no se pierde (se recupera lo último persistido).
    session.flushTimer = setInterval(() => void this.flush(sessionId), 10 * 1000);

    this.sessions.set(sessionId, session);
    this.logger.log(`Recorder session started: ${sessionId}`);

    return session;
  }

  async stop(sessionId: string, user: JwtPayload): Promise<void> {
    const session = this.getSessionOrThrow(sessionId, user.orgId);
    if (session.expireTimer) clearTimeout(session.expireTimer);
    if (session.flushTimer) clearInterval(session.flushTimer);

    // Guardar primero; si falla, NO borrar la sesión en silencio: se propaga el error
    // (el usuario sabrá que no se guardó) pero el contenedor sí se limpia.
    try {
      await this.saveRecording(session);
    } finally {
      await this.destroyContainer(session.containerId);
    }
    session.status = 'STOPPED';
    this.sessions.delete(sessionId);
  }

  addStep(sessionId: string, step: CapturedStep): void {
    const session = this.sessions.get(sessionId);
    if (session?.status === 'ACTIVE') {
      session.steps.push(step);
    }
  }

  getSession(sessionId: string): RecorderSession | undefined {
    return this.sessions.get(sessionId);
  }

  async convertToTest(recordingId: string, suiteId: string, testName: string, orgId: string) {
    const rec = await this.getRecording(recordingId, orgId);

    // Verify suite belongs to org
    const suite = await this.prisma.testSuite.findFirst({
      where: { id: suiteId, project: { organizationId: orgId } },
    });
    if (!suite) throw new NotFoundException('Test suite not found');

    const rawSteps = (rec.steps as unknown as CapturedStep[]);
    const mappedSteps = this.collapseSteps(rawSteps);

    return this.prisma.$transaction(async (tx) => {
      const test = await tx.test.create({
        data: {
          suiteId,
          name: testName,
          description: `Generado desde grabación de ${rec.targetUrl}`,
          flowModel: mappedSteps as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      });

      for (let i = 0; i < mappedSteps.length; i++) {
        const { action, selector, selectorType, value, description } = mappedSteps[i];
        await tx.testStep.create({
          data: { testId: test.id, order: i, action, selector, selectorType, value, description },
        });
      }

      return test;
    });
  }

  /** Collapse consecutive type events, deduplicate same-URL navigates */
  private collapseSteps(steps: CapturedStep[]): MappedStep[] {
    const collapsed: CapturedStep[] = [];
    for (const step of steps) {
      const prev = collapsed[collapsed.length - 1];
      if (step.type === 'type' && prev?.type === 'type') {
        prev.value = (prev.value ?? '') + (step.value ?? '');
        continue;
      }
      if (step.type === 'navigate' && prev?.type === 'navigate' && prev.url === step.url) {
        continue;
      }
      collapsed.push({ ...step });
    }
    return collapsed.map((step) => this.toTestStep(step));
  }

  private toTestStep(step: CapturedStep): MappedStep {
    const stype = step.selectorType ?? 'css';
    switch (step.type) {
      case 'navigate':
        return { action: 'navigate', value: step.url, description: `Navegar a ${step.url}` };
      case 'click':
        return step.selector
          ? { action: 'click', selector: step.selector, selectorType: stype, description: `Click en ${step.selector}` }
          : { action: 'click', value: JSON.stringify({ x: step.x, y: step.y }), description: `Click en (${step.x}, ${step.y})` };
      case 'dblclick':
        return step.selector
          ? { action: 'dblclick', selector: step.selector, selectorType: stype, description: `Doble click en ${step.selector}` }
          : { action: 'dblclick', value: JSON.stringify({ x: step.x, y: step.y }), description: `Doble click en (${step.x}, ${step.y})` };
      case 'fill':
        return { action: 'fill', selector: step.selector, selectorType: stype, value: step.value, description: `Escribir "${step.value}"` };
      case 'type':
        return { action: 'fill', value: step.value, description: `Teclear "${step.value}"` };
      case 'press':
        return { action: 'press', value: step.key, description: `Presionar ${step.key}` };
      case 'select':
        return { action: 'select', selector: step.selector, selectorType: stype, value: step.value, description: `Seleccionar "${step.value}"` };
      case 'hover':
        return { action: 'hover', selector: step.selector, selectorType: stype, description: `Hover en ${step.selector}` };
      default:
        return { action: step.type, description: step.type };
    }
  }

  async getRecordings(orgId: string, projectId?: string) {
    return this.prisma.recording.findMany({
      where: { orgId, ...(projectId ? { projectId } : {}) },
      select: {
        id: true,
        sessionId: true,
        projectId: true,
        targetUrl: true,
        startedAt: true,
        stoppedAt: true,
        steps: true,
        project: { select: { name: true } },
      },
      orderBy: { stoppedAt: 'desc' },
    });
  }

  async getRecording(id: string, orgId: string) {
    const rec = await this.prisma.recording.findUnique({ where: { id } });
    if (!rec || rec.orgId !== orgId) throw new NotFoundException('Recording not found');
    return rec;
  }

  async deleteRecording(id: string, orgId: string): Promise<void> {
    await this.getRecording(id, orgId);
    await this.prisma.recording.delete({ where: { id } });
  }

  /** Guardado final de la grabación. Lanza si falla — el llamador decide cómo reaccionar. */
  private async saveRecording(session: RecorderSession): Promise<void> {
    await this.persist(session, true);
    this.logger.log(`Recording saved: ${session.sessionId} (${session.steps.length} steps)`);
  }

  /** Flush periódico best-effort: persiste el progreso sin marcar la grabación como finalizada. */
  private async flush(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'ACTIVE' || session.steps.length === 0) return;
    try {
      await this.persist(session, false);
    } catch (err) {
      this.logger.warn(`Flush de la grabación ${sessionId} falló: ${String(err)}`);
    }
  }

  /**
   * Upsert idempotente por sessionId — convive con los flushes incrementales. Solo el
   * guardado final (`finalize=true`) fija `stoppedAt`.
   */
  private async persist(session: RecorderSession, finalize: boolean): Promise<void> {
    const steps = session.steps as object[];
    await this.prisma.recording.upsert({
      where: { sessionId: session.sessionId },
      update: { steps, ...(finalize ? { stoppedAt: new Date() } : {}) },
      create: {
        sessionId: session.sessionId,
        projectId: session.projectId,
        orgId: session.orgId,
        targetUrl: session.targetUrl,
        steps,
        startedAt: session.startedAt,
        ...(finalize ? { stoppedAt: new Date() } : {}),
      },
    });
  }

  private getSessionOrThrow(sessionId: string, orgId: string): RecorderSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.orgId !== orgId) {
      throw new NotFoundException('Recording session not found');
    }
    return session;
  }

  private async expire(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session?.status === 'ACTIVE') {
      if (session.flushTimer) clearInterval(session.flushTimer);
      this.logger.warn(`Session ${sessionId} expired`);
      // Best-effort: es un timer en background, no hay a quién propagar el error.
      try {
        await this.saveRecording(session);
      } catch (err) {
        this.logger.error(`Failed to save expired recording ${sessionId}: ${String(err)}`);
      }
      await this.destroyContainer(session.containerId).catch(() => null);
      session.status = 'EXPIRED';
      this.sessions.delete(sessionId);
    }
  }

  private async destroyContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop({ t: 5 }).catch(() => null);
    await container.remove().catch(() => null);
  }

  async onModuleDestroy(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.expireTimer) clearTimeout(session.expireTimer);
      if (session.flushTimer) clearInterval(session.flushTimer);
      await this.destroyContainer(session.containerId).catch(() => null);
    }
  }
}
