import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/** Entre intento e intento. Tres intentos cubren ~1 s, que es de sobra para un cierre de archivo. */
const ESPERA_MS = 500;
const INTENTOS = 3;

@Injectable()
export class ArtifactCollectorService {
  private readonly logger = new Logger(ArtifactCollectorService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Busca los artefactos de un test y devuelve sus URLs.
   *
   * Reintenta a proposito. Playwright escribe el video al cerrar el contexto y la traza al
   * pararla; este metodo mira el disco justo despues de que el contenedor termina. Con una
   * sola comprobacion, un desfase de milisegundos dejaba la columna en `null` PARA SIEMPRE
   * y sin rastro: la ejecucion salia bien y la prueba de que salio bien desaparecia, sin
   * que nadie pudiera saber si es que no se genero o que no se encontro.
   *
   * Y lo que no aparece se dice en el log. Un `null` mudo es lo que hizo falta media tarde
   * para diagnosticar el 2026-09-05.
   */
  async getArtifactUrls(
    executionId: string,
    testId: string,
  ): Promise<{
    screenshotUrl: string | null;
    videoUrl: string | null;
    traceUrl: string | null;
  }> {
    const base = this.config.get<string>('ARTIFACTS_VOLUME_PATH', '/artifacts');
    const dir = path.join(base, executionId);

    const buscados = {
      screenshotUrl: `${testId}_final.png`,
      videoUrl: `${testId}.webm`,
      traceUrl: `${testId}.zip`,
    };

    const encontrados: Record<string, string | null> = {
      screenshotUrl: null,
      videoUrl: null,
      traceUrl: null,
    };

    for (let intento = 1; intento <= INTENTOS; intento++) {
      for (const [clave, nombre] of Object.entries(buscados)) {
        if (encontrados[clave]) continue;
        if (fs.existsSync(path.join(dir, nombre))) {
          encontrados[clave] = `/artifacts/${executionId}/${nombre}`;
        }
      }
      if (Object.values(encontrados).every((v) => v !== null)) break;
      if (intento < INTENTOS) await new Promise((r) => setTimeout(r, ESPERA_MS));
    }

    const faltan = Object.entries(encontrados)
      .filter(([, v]) => v === null)
      .map(([k]) => buscados[k as keyof typeof buscados]);
    if (faltan.length > 0) {
      this.logger.warn(
        `Ejecucion ${executionId}, test ${testId}: no aparecieron ${faltan.join(', ')} ` +
          `tras ${INTENTOS} intentos en ${dir}`,
      );
    }

    return {
      screenshotUrl: encontrados['screenshotUrl'] ?? null,
      videoUrl: encontrados['videoUrl'] ?? null,
      traceUrl: encontrados['traceUrl'] ?? null,
    };
  }
}
