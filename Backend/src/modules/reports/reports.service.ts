import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { renderExecutionReportHtml } from './report-html';
import type { ReportStepView, ReportTestView, ReportView } from './report-html';

/** Tope por captura embebida. Una captura de 1280x720 en PNG ronda los 100-300 KB. */
const MAX_CAPTURA_BYTES = 3 * 1024 * 1024;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getExecutionReport(executionId: string, user: JwtPayload) {
    const execution = await this.prisma.execution.findFirst({
      where: { id: executionId, project: { organizationId: user.orgId } },
      include: {
        project: { select: { id: true, name: true, baseUrl: true } },
        results: {
          include: {
            test: { select: { id: true, name: true } },
            stepResults: {
              include: { step: { select: { id: true, order: true, action: true, description: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!execution) throw new NotFoundException('Execution not found');

    const passed = execution.results.filter((r) => r.status === 'COMPLETED').length;
    const failed = execution.results.filter((r) => r.status === 'FAILED').length;
    const totalDuration = execution.results.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);

    return {
      executionId: execution.id,
      project: execution.project,
      status: execution.status,
      triggeredBy: execution.triggeredBy,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      summary: { total: execution.results.length, passed, failed, totalDurationMs: totalDuration },
      results: execution.results,
    };
  }

  /**
   * El mismo informe, en HTML autocontenido.
   *
   * Reutiliza `getExecutionReport()` tal cual: los datos y sus filtros de organizacion son
   * exactamente los mismos, aqui solo cambia como se pintan. Duplicar la consulta habria
   * sido duplicar tambien el filtro por `orgId`, que es justo lo que no puede desviarse.
   *
   * `token` se usa solo para los enlaces de video y traza, que no se pueden embeber por
   * tamano. Las capturas van dentro del archivo y no dependen de el.
   */
  async getExecutionReportHtml(executionId: string, user: JwtPayload, token?: string): Promise<string> {
    const r = await this.getExecutionReport(executionId, user);
    const sufijo = token ? `?token=${encodeURIComponent(token)}` : '';

    // `triggeredBy` guarda un userId. Sin esto, el informe decia «Lanzada por
    // fcf97a7a-96a3-4ed3-...», que no le dice nada a nadie. Si el usuario ya no existe,
    // mejor no decir quien que ensenar el identificador.
    const lanzador = r.triggeredBy
      ? await this.prisma.user.findUnique({
          where: { id: r.triggeredBy },
          select: { displayName: true },
        })
      : null;

    const tests: ReportTestView[] = r.results.map((res) => {
      const pasos: ReportStepView[] = res.stepResults.map((sr) => ({
        order: sr.step?.order ?? 0,
        descripcion: sr.step?.description ?? this.describirAccion(sr.step?.action),
        status: sr.status,
        durationMs: sr.durationMs,
        captura: this.embeber(sr.screenshotUrl),
      }));

      return {
        nombre: res.test.name,
        status: res.status,
        durationMs: res.durationMs,
        errorMessage: res.errorMessage,
        captura: this.embeber(res.screenshotUrl),
        videoUrl: res.videoUrl ? res.videoUrl + sufijo : null,
        trazaUrl: res.traceUrl ? res.traceUrl + sufijo : null,
        pasos,
      };
    });

    const vista: ReportView = {
      proyecto: r.project.name,
      baseUrl: r.project.baseUrl,
      status: r.status,
      lanzadoPor: lanzador?.displayName ?? null,
      inicio: r.startedAt,
      fin: r.completedAt,
      total: r.summary.total,
      pasaron: r.summary.passed,
      fallaron: r.summary.failed,
      duracionTotalMs: r.summary.totalDurationMs,
      tests,
    };

    return renderExecutionReportHtml(vista);
  }

  /**
   * Convierte la URL de una captura en un data URI leyendo el archivo del volumen.
   *
   * Devuelve `null` ante cualquier problema — que falte una captura no puede tumbar el
   * informe entero. Valida el nombre igual que `artifacts.controller.ts` y comprueba que
   * la ruta resuelta siga dentro del volumen: la URL viene de la base, pero la escribio
   * un contenedor y no se trata como de fiar.
   */
  private embeber(url: string | null): string | null {
    if (!url) return null;
    try {
      const partes = url.split('/').filter(Boolean); // artifacts/<executionId>/<archivo>
      if (partes.length !== 3 || partes[0] !== 'artifacts') return null;
      const [, execId, archivo] = partes;
      if (!/^[A-Za-z0-9-]+$/.test(execId)) return null;
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(archivo) || archivo.includes('..')) return null;
      if (!archivo.toLowerCase().endsWith('.png')) return null;

      const raiz = path.resolve(this.config.get<string>('ARTIFACTS_VOLUME_PATH', '/artifacts'));
      const ruta = path.resolve(raiz, execId, archivo);
      if (!ruta.startsWith(raiz + path.sep)) return null;

      const stat = fs.statSync(ruta);
      if (!stat.isFile() || stat.size > MAX_CAPTURA_BYTES) return null;

      return `data:image/png;base64,${fs.readFileSync(ruta).toString('base64')}`;
    } catch {
      return null;
    }
  }

  /** Ultimo recurso cuando un paso no tiene descripcion: nunca ensenar el nombre tecnico a secas. */
  private describirAccion(action?: string): string {
    const nombres: Record<string, string> = {
      navigate: 'Ir a una pagina',
      click: 'Pulsar un elemento',
      dblclick: 'Pulsar dos veces un elemento',
      fill: 'Escribir en un campo',
      press: 'Pulsar una tecla',
      select: 'Elegir una opcion',
      hover: 'Poner el raton encima',
      assert_visible: 'Comprobar que algo se ve',
      assert_text: 'Comprobar un texto',
      wait: 'Esperar',
    };
    return nombres[action ?? ''] ?? 'Paso de la prueba';
  }
}
