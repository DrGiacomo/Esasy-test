import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

@Injectable()
export class DockerService {
  private readonly docker = new Docker(
    process.platform === 'win32'
      ? { socketPath: '//./pipe/dockerDesktopLinuxEngine' }
      : { socketPath: '/var/run/docker.sock' },
  );
  private readonly logger = new Logger(DockerService.name);

  constructor(private readonly config: ConfigService) {}

  async runExecutionContainer(executionId: string, envVars: string[]): Promise<string> {
    const image = this.config.get<string>('EXECUTION_IMAGE')!;
    const network = this.config.get<string>('DOCKER_NETWORK')!;

    // Idempotencia: si un intento previo dejó un contenedor con este nombre, eliminarlo
    // antes de crear (evita el conflicto de nombre 409 en reintentos de BullMQ).
    await this.removeByName(`exec-${executionId}`);

    const container = await this.docker.createContainer({
      name: `exec-${executionId}`,
      Image: image,
      Env: envVars,
      HostConfig: {
        NetworkMode: network,
        Binds: [`${this.config.get('ARTIFACTS_VOLUME_PATH')}:/artifacts`],
        AutoRemove: false,
      },
      Labels: { 'e2e.executionId': executionId },
    });

    await container.start();
    this.logger.log(`Container started for execution ${executionId}: ${container.id}`);
    return container.id;
  }

  async waitForContainer(containerId: string): Promise<{ exitCode: number }> {
    const container = this.docker.getContainer(containerId);
    const result = await container.wait();
    return { exitCode: result.StatusCode };
  }

  async stopAndRemove(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 10 }).catch(() => null); // ignorar si ya paró
      await container.remove();
    } catch (err) {
      this.logger.warn(`Could not remove container ${containerId}: ${String(err)}`);
    }
  }

  /** Elimina (forzado) un contenedor por nombre si existe. No falla si no existe. */
  async removeByName(name: string): Promise<void> {
    try {
      await this.docker.getContainer(name).remove({ force: true });
      this.logger.warn(`Removed pre-existing container ${name}`);
    } catch {
      // No existe — nada que hacer.
    }
  }
}
