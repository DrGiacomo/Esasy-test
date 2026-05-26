import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { randomUUID } from 'crypto';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { RecorderSession } from './recorder-session';

@Injectable()
export class RecorderService implements OnModuleDestroy {
  private readonly logger = new Logger(RecorderService.name);
  private readonly docker = new Docker({ socketPath: '/var/run/docker.sock' });
  private readonly sessions = new Map<string, RecorderSession>();

  constructor(private readonly config: ConfigService) {}

  async start(projectId: string, targetUrl: string, user: JwtPayload): Promise<RecorderSession> {
    const sessionId = randomUUID();
    const image = this.config.get<string>('RECORDER_IMAGE')!;
    const network = this.config.get<string>('DOCKER_NETWORK')!;

    const container = await this.docker.createContainer({
      name: `recorder-${sessionId}`,
      Image: image,
      Env: [
        `SESSION_ID=${sessionId}`,
        `TARGET_URL=${targetUrl}`,
        `BACKEND_WS_URL=ws://backend:3000`,
      ],
      HostConfig: { NetworkMode: network, AutoRemove: false },
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
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Recorder session started: ${sessionId}`);

    // Auto-expirar sesión sin actividad después de 30 minutos
    setTimeout(() => this.expire(sessionId), 30 * 60 * 1000);

    return session;
  }

  async stop(sessionId: string, user: JwtPayload): Promise<void> {
    const session = this.getSessionOrThrow(sessionId, user.orgId);
    await this.destroyContainer(session.containerId);
    session.status = 'STOPPED';
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): RecorderSession | undefined {
    return this.sessions.get(sessionId);
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
      this.logger.warn(`Session ${sessionId} expired`);
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
    // Limpiar todos los contenedores activos al apagar el servidor
    for (const session of this.sessions.values()) {
      await this.destroyContainer(session.containerId).catch(() => null);
    }
  }
}
