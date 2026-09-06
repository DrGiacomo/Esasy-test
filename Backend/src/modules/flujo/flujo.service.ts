import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Lo que hay en cada punto del recorrido, para una organización. */
export interface ResumenDelFlujo {
  grabaciones: { total: number };
  pruebas: { borrador: number; activas: number; archivadas: number };
  ejecuciones: {
    enCola: number;
    preparando: number;
    ejecutando: number;
    recogiendo: number;
    terminadas: number;
    fallidas: number;
    canceladas: number;
  };
  resultados: { pasaron: number; fallaron: number; omitidos: number };
  reparaciones: { pendientes: number; aprobadas: number; rechazadas: number };
  /** Cuándo se calculó. Un número sin su hora empieza a caducar sin avisar. */
  medidoEn: string;
}

@Injectable()
export class FlujoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cuenta qué hay en cada estado del recorrido, para la organización de quien pregunta.
   *
   * Sirve al diagrama del flujo: un dibujo del proceso que además dice cuántas cosas hay
   * paradas en cada punto. Un diagrama sin números explica cómo funciona la herramienta;
   * con números, dice qué está pasando ahora — y esa es la diferencia entre un dibujo de
   * documentación y una pantalla que se mira todos los días.
   *
   * Todo va filtrado por organización, como el resto: los contadores de otro cliente no se
   * ven ni sumados.
   */
  async resumen(orgId: string): Promise<ResumenDelFlujo> {
    const deLaOrg = { project: { organizationId: orgId } };
    const testsDeLaOrg = { suite: { project: { organizationId: orgId } } };

    // Todo en paralelo: son quince cuentas y en serie serían quince viajes a la base.
    const [
      grabaciones,
      pruebasPorEstado,
      ejecucionesPorEstado,
      resultadosPorEstado,
      reparacionesPorEstado,
    ] = await Promise.all([
      this.prisma.recording.count({ where: { orgId } }),
      this.prisma.test.groupBy({
        by: ['status'],
        where: testsDeLaOrg,
        _count: { _all: true },
      }),
      this.prisma.execution.groupBy({
        by: ['status'],
        where: deLaOrg,
        _count: { _all: true },
      }),
      this.prisma.stepResult.groupBy({
        by: ['status'],
        where: { executionResult: { execution: deLaOrg } },
        _count: { _all: true },
      }),
      this.prisma.selectorHealingLog.groupBy({
        by: ['status'],
        where: { test: testsDeLaOrg },
        _count: { _all: true },
      }),
    ]);

    const cuenta = (
      filas: { status: string; _count: { _all: number } }[],
      estado: string,
    ): number => filas.find((f) => f.status === estado)?._count._all ?? 0;

    return {
      // Solo el total, y no «cuántas quedan por convertir», que sería el dato útil:
      // una grabación NO guarda si ya se convirtió en prueba. No hay relación entre
      // `Recording` y `Test` — la conversión copia los pasos y no deja rastro de vuelta.
      // Se anota en PENDIENTES en vez de inventar aquí un número aproximado.
      grabaciones: {
        total: grabaciones,
      },
      pruebas: {
        borrador: cuenta(pruebasPorEstado, 'DRAFT'),
        activas: cuenta(pruebasPorEstado, 'ACTIVE'),
        archivadas: cuenta(pruebasPorEstado, 'ARCHIVED'),
      },
      ejecuciones: {
        enCola: cuenta(ejecucionesPorEstado, 'QUEUED'),
        preparando: cuenta(ejecucionesPorEstado, 'PROVISIONING'),
        ejecutando: cuenta(ejecucionesPorEstado, 'RUNNING'),
        recogiendo: cuenta(ejecucionesPorEstado, 'COLLECTING'),
        terminadas: cuenta(ejecucionesPorEstado, 'COMPLETED'),
        fallidas: cuenta(ejecucionesPorEstado, 'FAILED'),
        canceladas: cuenta(ejecucionesPorEstado, 'CANCELLED'),
      },
      resultados: {
        pasaron: cuenta(resultadosPorEstado, 'PASSED'),
        fallaron: cuenta(resultadosPorEstado, 'FAILED'),
        omitidos: cuenta(resultadosPorEstado, 'SKIPPED'),
      },
      reparaciones: {
        pendientes: cuenta(reparacionesPorEstado, 'PENDING_APPROVAL'),
        aprobadas: cuenta(reparacionesPorEstado, 'APPROVED'),
        rechazadas: cuenta(reparacionesPorEstado, 'REJECTED'),
      },
      medidoEn: new Date().toISOString(),
    };
  }
}
