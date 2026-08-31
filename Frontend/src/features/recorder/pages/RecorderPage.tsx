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
  const { projects, loading: loadingProjects } = useProjects();

  const { frame, capturedSteps, connected, performAction } = useRecorderSocket(session?.sessionId ?? null);

  async function startSession() {
    if (!targetUrl || !selectedProjectId) return;
    setStopping(true);
    try {
      const res = await api.post<RecorderSession>('/recorder/sessions', { targetUrl, projectId: selectedProjectId });
      setSession(res.data);
    } finally { setStopping(false); }
  }

  async function stopSession() {
    if (!session) return;
    setStopping(true);
    try {
      await api.delete(`/recorder/sessions/${session.sessionId}`);
      setSession(null);
    } finally { setStopping(false); }
  }

  function handleNavigate(url: string) {
    performAction({ type: 'navigate', url });
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <Video size={48} className="text-gray-300" />
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">Grabador de pruebas</h1>
          <p className="text-sm text-gray-500 text-center">
            Ingresa la URL de la aplicación que quieres grabar. El navegador remoto se abrirá y tus acciones se convertirán en pasos de prueba automáticamente.
          </p>
          <div className="space-y-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={loadingProjects}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">
                {loadingProjects ? 'Cargando proyectos…' : 'Selecciona un proyecto'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://mi-app.com"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
      <div className="w-64 border-l border-gray-700 bg-gray-900 p-4 overflow-y-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Pasos capturados ({capturedSteps.length})
        </p>
        <div className="space-y-1">
          {capturedSteps.map((step, i) => (
            <div key={i} className="rounded bg-gray-800 px-3 py-2 text-xs text-gray-300">
              <span className="font-medium text-indigo-400">{step.type}</span>
              {step.selector && <span className="ml-1 text-gray-500 font-mono truncate">{step.selector}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
