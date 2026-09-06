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
        // Dos variables porque son dos preguntas distintas, y confundirlas costo una
        // tarde: ARTIFACTS_MOUNT es QUE se monta en el contenedor de ejecucion -una
        // carpeta del disco en desarrollo, el nombre de un volumen dentro de Docker- y
        // ARTIFACTS_VOLUME_PATH es DONDE lee sus archivos este proceso. En desarrollo
        // coinciden; corriendo dentro de Docker no, y usar una por la otra produce
        // ejecuciones COMPLETED sin video ni traza, sin un solo error por ningun lado.
        Binds: [
          `${this.config.get('ARTIFACTS_MOUNT') ?? this.config.get('ARTIFACTS_VOLUME_PATH')}:/artifacts`,
        ],
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
    // `container.wait()` de dockerode devuelve `any`. Se declara la forma para que
    // `StatusCode` este comprobado: es el codigo de salida del que depende si la
    // ejecucion se marca COMPLETED o FAILED.
    const result = (await container.wait()) as { StatusCode?: number };
    return { exitCode: result.StatusCode ?? -1 };
  }

  /**
   * Ultimas lineas que escribio el contenedor. Se lee ANTES de eliminarlo: al hacer
   * `remove()` los logs se van con el, y hasta hoy nadie los leia. Sin esto, un fallo del
   * motor -Chromium que no arranca, la red que no resuelve, memoria agotada- y un fallo de
   * la prueba del usuario se ven exactamente igual desde la pantalla.
   *
   * Nunca lanza: esto es diagnostico y el diagnostico no puede tumbar lo que diagnostica
   * (`S3`). Si no se pueden leer, se devuelve cadena vacia.
   */
  async getLogs(containerId: string, lines = 200): Promise<string> {
    try {
      const buffer = await this.docker.getContainer(containerId).logs({
        stdout: true,
        stderr: true,
        tail: lines,
      });
      // Docker multiplexa stdout/stderr con una cabecera binaria de 8 bytes por trama
      // cuando el contenedor no tiene TTY. Se filtran los caracteres de control -salvo
      // salto de linea y tabulador- para que el texto sea legible en la base y en un
      // archivo. Se hace por codigo de caracter y no con una expresion regular: meter
      // bytes de control dentro del codigo fuente ya rompio un archivo hoy.
      const texto = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
      return Array.from(texto)
        .filter((c) => {
          const codigo = c.charCodeAt(0);
          return codigo === 9 || codigo === 10 || (codigo >= 32 && codigo !== 127);
        })
        .join('');
    } catch (err) {
      this.logger.warn(`No se pudieron leer los logs de ${containerId}: ${String(err)}`);
      return '';
    }
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
