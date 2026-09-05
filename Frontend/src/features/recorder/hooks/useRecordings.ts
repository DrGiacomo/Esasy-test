import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios.client';

export interface RecordingStep {
  type: string;
  selector?: string;
  value?: string;
  url?: string;
  key?: string;
  x?: number;
  y?: number;
}

export interface Recording {
  id: string;
  sessionId: string;
  projectId: string;
  targetUrl: string;
  startedAt: string;
  stoppedAt: string;
  steps: RecordingStep[];
  project: { name: string };
}

export function useRecordings(projectId?: string) {
  /**
   * Lo cargado, junto con el filtro al que corresponde.
   *
   * Van juntos a proposito: asi `loading` se DERIVA de comparar el filtro pedido con
   * el filtro de lo que hay en memoria, en vez de mantenerse a mano. Antes se hacia
   * `setLoading(true)` sincrono dentro del efecto — un render de mas, y un estado que
   * se puede desincronizar del que manda. Un estado derivado no.
   */
  const [cargado, setCargado] = useState<{ filtro?: string; items: Recording[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recargas, setRecargas] = useState(0);

  const loading = cargado === null || cargado.filtro !== projectId;
  const recordings = cargado?.items ?? [];

  useEffect(() => {
    let vigente = true;
    const params = projectId ? `?projectId=${projectId}` : '';
    api
      .get<Recording[]>(`/recorder/recordings${params}`)
      .then((r) => {
        // Si el filtro cambio mientras esta peticion volaba, su respuesta ya no vale:
        // pintarla sobreescribiria la del filtro nuevo con datos del viejo.
        if (vigente) setCargado({ filtro: projectId, items: r.data });
      })
      .catch((e) => {
        if (vigente) {
          setError((e as Error).message);
          setCargado({ filtro: projectId, items: [] });
        }
      });
    return () => {
      vigente = false;
    };
  }, [projectId, recargas]);

  /** Vuelve a pedir la lista del filtro actual. */
  const refetch = () => {
    setError(null);
    setCargado(null);
    setRecargas((n) => n + 1);
  };

  return { recordings, loading, error, refetch };
}

export async function deleteRecording(id: string): Promise<void> {
  await api.delete(`/recorder/recordings/${id}`);
}

export async function convertRecordingToTest(
  recordingId: string,
  suiteId: string,
  testName: string,
): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>(`/recorder/recordings/${recordingId}/convert`, {
    suiteId,
    testName,
  });
  return res.data;
}
