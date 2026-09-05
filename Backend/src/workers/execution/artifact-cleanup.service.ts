import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Limpieza de artefactos antiguos. El executor escribe video/screenshots/HTML en el
 * volumen `/artifacts/{executionId}/`; sin retención el disco crece sin límite. Borra
 * directorios cuya antigüedad supere ARTIFACTS_RETENTION_DAYS (0 = no limpiar).
 * Corre en el worker, que es quien tiene el volumen de artefactos montado.
 */
@Injectable()
export class ArtifactCleanupService {
  private readonly logger = new Logger(ArtifactCleanupService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Corre de madrugada en el worker y usa `fs` síncrono a propósito.
   *
   * Pasarlo a `fs.promises` no bloquearía el bucle de eventos mientras borra, que sería
   * mejor — pero exigiría reescribir `artifact-cleanup.service.spec.ts`, que simula las
   * funciones síncronas. Cambiar un test verde para callar un aviso de estilo es
   * exactamente la clase de arreglo que este proyecto ya pagó caro. Queda anotado como
   * mejora, no como deuda urgente: son unos pocos borrados a las 3 de la mañana.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'artifact-cleanup' })
  // eslint-disable-next-line @typescript-eslint/require-await -- ver el comentario de arriba
  async cleanup(): Promise<number> {
    const retentionDays = this.config.get<number>('ARTIFACTS_RETENTION_DAYS', 14);
    if (!retentionDays || retentionDays <= 0) return 0;

    const base = this.config.get<string>('ARTIFACTS_VOLUME_PATH', '/artifacts');
    if (!fs.existsSync(base)) return 0;

    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(base, { withFileTypes: true });
    } catch (err) {
      this.logger.error(`No se pudo listar ${base}: ${String(err)}`);
      return 0;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(base, entry.name);
      try {
        if (fs.statSync(dir).mtimeMs < cutoff) {
          fs.rmSync(dir, { recursive: true, force: true });
          removed++;
        }
      } catch (err) {
        this.logger.warn(`No se pudo evaluar/borrar ${dir}: ${String(err)}`);
      }
    }

    if (removed > 0) {
      this.logger.log(
        `Limpieza de artefactos: ${removed} ejecución(es) > ${retentionDays}d eliminadas`,
      );
    }
    return removed;
  }
}
