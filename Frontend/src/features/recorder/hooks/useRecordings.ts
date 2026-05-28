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
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetch() {
    setLoading(true);
    const params = projectId ? `?projectId=${projectId}` : '';
    api.get<Recording[]>(`/recorder/recordings${params}`)
      .then(r => setRecordings(r.data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetch(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { recordings, loading, error, refetch: fetch };
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
