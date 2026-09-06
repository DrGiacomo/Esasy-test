import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/axios.client';

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
  medidoEn: string;
}

/**
 * Trae el recuento de qué hay en cada punto del flujo.
 *
 * Vive en un hook y no dentro de la página por dos motivos, y el segundo pesa más:
 *
 *  1. La página se queda con lo suyo, que es dibujar.
 *  2. El efecto encadena promesas en vez de esperar con `await` dentro de sí mismo. Da
 *     igual para el resultado, pero evita cambiar estado de forma síncrona dentro del
 *     efecto —renders en cascada— y, de paso, mete la bandera `vigente`: si alguien se va
 *     de la pantalla mientras la petición viaja, la respuesta no intenta pintar sobre un
 *     componente que ya no está.
 */
export function useResumenDelFlujo() {
  const [datos, setDatos] = useState<ResumenDelFlujo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    api
      .get<ResumenDelFlujo>('/flujo/resumen')
      .then((res) => {
        if (!vigente) return;
        setDatos(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  /** Volver a preguntar. Lo llama un botón, nunca un efecto. */
  const recargar = useCallback(() => {
    setCargando(true);
    api
      .get<ResumenDelFlujo>('/flujo/resumen')
      .then((res) => {
        setDatos(res.data);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setCargando(false));
  }, []);

  return { datos, error, cargando, recargar };
}
