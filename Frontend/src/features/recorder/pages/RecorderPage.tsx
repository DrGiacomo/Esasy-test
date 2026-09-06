import { useState } from 'react';
import { api } from '@/lib/api/axios.client';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useRecorderSocket } from '../hooks/useRecorderSocket';
import { RemoteBrowserFrame } from '../components/RemoteBrowserFrame';
import { RecorderToolbar } from '../components/RecorderToolbar';
import { ActionFeedOverlay } from '../components/ActionFeedOverlay';
import type { RecorderSession } from '../recorder.types';
import { Button } from '@/components/ui/Button';
import { Video } from 'lucide-react';

export default function RecorderPage() {
  const [session, setSession] = useState<RecorderSession | null>(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [starting, setStopping] = useState(false);
  // Si el usuario ha escrito su propia URL, elegir otro proyecto NO se la pisa. Perder
  // lo que alguien acaba de teclear es peor que ahorrarle el copiar-pegar.
  const [urlEditadaAMano, setUrlEditadaAMano] = useState(false);
  const { projects, loading: loadingProjects } = useProjects();

  /**
   * Al elegir proyecto se rellena la URL con la suya. La plataforma ya sabía cuál era
   * -está en el proyecto desde que se creó- y aun así obligaba a escribirla otra vez.
   */
  function elegirProyecto(projectId: string) {
    setSelectedProjectId(projectId);
    if (urlEditadaAMano) return;
    const proyecto = projects.find((p) => p.id === projectId);
    setTargetUrl(proyecto?.baseUrl ?? '');
  }

  const { frame, capturedSteps, connected, performAction } = useRecorderSocket(
    session?.sessionId ?? null,
  );

  async function startSession() {
    if (!targetUrl || !selectedProjectId) return;
    setStopping(true);
    try {
      const res = await api.post<RecorderSession>('/recorder/sessions', {
        targetUrl,
        projectId: selectedProjectId,
      });
      setSession(res.data);
    } finally {
      setStopping(false);
    }
  }

  async function stopSession() {
    if (!session) return;
    setStopping(true);
    try {
      await api.delete(`/recorder/sessions/${session.sessionId}`);
      setSession(null);
    } finally {
      setStopping(false);
    }
  }

  function handleNavigate(url: string) {
    performAction({ type: 'navigate', url });
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <Video size={48} className="text-tinta-300" />
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold text-tinta-900 text-center">Grabador de pruebas</h1>
          <p className="text-sm text-tinta-500 text-center">
            Elige el proyecto y se rellenará su dirección. Puedes cambiarla para grabar una
            parte concreta. El navegador remoto se abrirá y tus acciones se convertirán en
            pasos de prueba automáticamente.
          </p>
          <div className="space-y-3">
            <select
              value={selectedProjectId}
              onChange={(e) => elegirProyecto(e.target.value)}
              disabled={loadingProjects}
              className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
            >
              <option value="">
                {loadingProjects ? 'Cargando proyectos…' : 'Selecciona un proyecto'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={targetUrl}
                onChange={(e) => {
                  setTargetUrl(e.target.value);
                  setUrlEditadaAMano(true);
                }}
                placeholder="https://mi-app.com"
                className="flex-1 rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
              />
              <Button
                onClick={() => void startSession()}
                loading={starting}
                disabled={!selectedProjectId || !targetUrl}
              >
                Iniciar grabación
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-6">
      <div className="flex flex-1 flex-col">
        <RecorderToolbar
          onNavigate={handleNavigate}
          onStop={() => void stopSession()}
          loading={starting}
        />
        <div className="relative flex-1">
          <RemoteBrowserFrame frame={frame} connected={connected} onAction={performAction} />
          <ActionFeedOverlay steps={capturedSteps} />
        </div>
      </div>

      {/* Panel derecho: pasos capturados */}
      <div className="w-64 border-l border-tinta-700 bg-tinta-900 p-4 overflow-y-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-tinta-500">
          Pasos capturados ({capturedSteps.length})
        </p>
        <div className="space-y-1">
          {capturedSteps.map((step, i) => (
            <div key={i} className="rounded bg-tinta-800 px-3 py-2 text-xs text-tinta-300">
              <span className="font-medium text-oro-500">{step.type}</span>
              {step.selector && (
                <span className="ml-1 text-tinta-500 font-mono truncate">{step.selector}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
