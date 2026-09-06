import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
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
export class RecorderService implements OnModuleInit, OnModuleDestroy {
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

  /**
   * Al arrancar, barre contenedores recorder huérfanos de un proceso anterior
   * (AutoRemove:false → tras un crash del backend nunca se eliminaban solos, solo se
   * auto-apagaban a los 30 min y se acumulaban como `exited`). Best-effort: si Docker
   * no está disponible no debe impedir el arranque del backend.
   */
  async onModuleInit(): Promise<void> {
    try {
      const orphans = await this.docker.listContainers({
        all: true,
        filters: { label: ['e2e.recorder'] },
      });
      for (const c of orphans) {
        await this.docker
          .getContainer(c.Id)
          .remove({ force: true })
          .catch(() => null);
      }
      if (orphans.length > 0) {
        this.logger.warn(
          `Reaped ${orphans.length} orphaned recorder container(s) from a previous run`,
        );
      }
    } catch (err) {
      this.logger.warn(`Recorder orphan sweep skipped: ${String(err)}`);
    }
  }

  async start(projectId: string, targetUrl: string, user: JwtPayload): Promise<RecorderSession> {
    // Verificar que el proyecto pertenece a la org del usuario antes de provisionar
    // nada: sin esto se creaban grabaciones referenciando proyectos de otra org.
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: user.orgId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const sessionId = randomUUID();
    const image = this.config.get<string>('RECORDER_IMAGE')!;
    const network = this.config.get<string>('DOCKER_NETWORK')!;

    const images = await this.docker.listImages({ filters: { reference: [image] } });
    if (images.length === 0) {
      throw new Error(
        `Docker image "${image}" not found. Run: docker compose --profile build-images build`,
      );
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
      // Label para poder barrer contenedores huérfanos tras un crash del backend (reap()).
      Labels: { 'e2e.recorder': sessionId },
      HostConfig: { NetworkMode: network, AutoRemove: false, ShmSize: 256 * 1024 * 1024 },
    });

    // Si start() falla, el contenedor ya creado (AutoRemove:false) quedaría huérfano.
    try {
      await container.start();
    } catch (err) {
      await container.remove({ force: true }).catch(() => null);
      throw err;
    }

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

    // Guardar primero; si falla, se propaga el error (el usuario sabrá que no se guardó),
    // pero el contenedor SIEMPRE se limpia y la sesión SIEMPRE sale del Map — antes, si
    // saveRecording() lanzaba, la sesión quedaba zombie en el Map (timers ya cancelados,
    // sin expire posible) hasta reiniciar el backend.
    try {
      await this.saveRecording(session);
    } finally {
      await this.destroyContainer(session.containerId);
      session.status = 'STOPPED';
      this.sessions.delete(sessionId);
    }
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
      include: { project: { select: { baseUrl: true } } },
    });
    if (!suite) throw new NotFoundException('Test suite not found');

    const rawSteps = rec.steps as unknown as CapturedStep[];

    // El primer paso SIEMPRE es ir a donde se grabó, y hasta hoy no estaba.
    //
    // La grabación empieza cuando el usuario hace algo, y para entonces el navegador ya
    // está en la página: esa primera navegación nunca llegó a ser un paso. Al reproducir,
    // el navegador arranca EN BLANCO y el primer clic espera 30 segundos a un elemento que
    // no existe porque no se ha ido a ninguna parte.
    //
    // No fallaba «a veces»: no podía funcionar NINGUNA prueba grabada. No se vio antes
    // porque las pruebas de ejemplo se siembran con su `navigate` escrito a mano, así que
    // el único material que lo habría delatado era una grabación de verdad. La primera que
    // hubo —`www.frivclassic.com`, 2026-09-06— lo delató a la primera.
    //
    // Se añade solo si la grabación no empieza ya por una navegación, para no duplicarla.
    const empiezaNavegando = rawSteps[0]?.type === 'navigate';
    const pasosConEntrada: CapturedStep[] =
      empiezaNavegando || !rec.targetUrl
        ? rawSteps
        : [{ type: 'navigate', url: rec.targetUrl }, ...rawSteps];

    const mappedSteps = this.collapseSteps(pasosConEntrada, suite.project.baseUrl);

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
  private collapseSteps(steps: CapturedStep[], baseUrl?: string | null): MappedStep[] {
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
    return collapsed.map((step) => this.toTestStep(step, baseUrl));
  }

  /**
   * Como se nombra el elemento en una descripcion para personas.
   *
   * Antes esto era el selector a pelo, y por eso la descripcion de un paso acababa siendo
   * «Click en #btn-login»: un selector con una frase delante. El perfil No-Code (§2.1 de
   * PROJECT_CONTEXT.md) no debe verlo, y `TestStep.description` existe justo para el.
   *
   * Recae en el selector solo cuando el recorder no pudo sacar etiqueta — es preferible
   * una descripcion tecnica a una vacia, y el modo sencillo la ensena igual.
   */
  private nombrar(step: CapturedStep): string {
    if (step.label) return `\u00ab${step.label}\u00bb`;
    if (step.selector) return step.selector;
    if (step.x !== undefined && step.y !== undefined) return `la posicion (${step.x}, ${step.y})`;
    return 'el elemento';
  }

  /**
   * Guarda la direccion RELATIVA al proyecto cuando cae dentro de el.
   *
   * Antes cada paso llevaba la direccion entera escrita dentro, y la `baseUrl` del
   * proyecto no la usaba nadie mas que la IA. La consecuencia era que mover la aplicacion
   * de sitio -de pruebas a produccion, o un dominio nuevo- obligaba a editar los tests
   * UNO A UNO. Con la parte relativa guardada, cambiar de entorno es cambiar un campo.
   *
   * Lo que NO hace, y es a proposito:
   *   - Si la URL apunta a otro dominio, se guarda entera. Un paso que sale de la
   *     aplicacion (una pasarela de pago, un correo) tiene que seguir yendo donde iba
   *     aunque el proyecto se mueva.
   *   - Si no hay `baseUrl`, no toca nada.
   *
   * Los tests que ya existen siguen funcionando: el ejecutor acepta las dos formas.
   */
  private relativizar(url: string | undefined, baseUrl?: string | null): string {
    if (!url) return '';
    if (!baseUrl) return url;
    let base: URL;
    let destino: URL;
    try {
      base = new URL(baseUrl);
      destino = new URL(url);
    } catch {
      return url; // Alguna de las dos no es una direccion valida: mejor no tocar nada.
    }
    if (base.origin !== destino.origin) return url;
    const relativa = `${destino.pathname}${destino.search}${destino.hash}`;
    return relativa || '/';
  }

  private toTestStep(step: CapturedStep, baseUrl?: string | null): MappedStep {
    const stype = step.selectorType ?? 'css';
    const que = this.nombrar(step);
    switch (step.type) {
      case 'navigate': {
        const destino = this.relativizar(step.url, baseUrl);
        return { action: 'navigate', value: destino, description: `Ir a ${destino}` };
      }
      case 'click':
        return step.selector
          ? {
              action: 'click',
              selector: step.selector,
              selectorType: stype,
              description: `Pulsar ${que}`,
            }
          : {
              action: 'click',
              value: JSON.stringify({ x: step.x, y: step.y }),
              description: `Pulsar en ${que}`,
            };
      case 'dblclick':
        return step.selector
          ? {
              action: 'dblclick',
              selector: step.selector,
              selectorType: stype,
              description: `Pulsar dos veces ${que}`,
            }
          : {
              action: 'dblclick',
              value: JSON.stringify({ x: step.x, y: step.y }),
              description: `Pulsar dos veces en ${que}`,
            };
      case 'fill':
        return {
          action: 'fill',
          selector: step.selector,
          selectorType: stype,
          value: step.value,
          description: `Escribir "${step.value}" en ${que}`,
        };
      case 'type':
        return { action: 'fill', value: step.value, description: `Escribir "${step.value}"` };
      case 'press':
        return { action: 'press', value: step.key, description: `Pulsar la tecla ${step.key}` };
      case 'select':
        return {
          action: 'select',
          selector: step.selector,
          selectorType: stype,
          value: step.value,
          description: `Elegir "${step.value}" en ${que}`,
        };
      case 'hover':
        return {
          action: 'hover',
          selector: step.selector,
          selectorType: stype,
          description: `Poner el raton sobre ${que}`,
        };
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
