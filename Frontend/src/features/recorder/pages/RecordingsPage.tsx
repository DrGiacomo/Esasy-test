import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Globe, ChevronDown, ChevronUp, Wand2, Trash2 } from 'lucide-react';
import {
  useRecordings,
  convertRecordingToTest,
  deleteRecording,
  type Recording,
  type RecordingStep,
} from '../hooks/useRecordings';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { api } from '@/lib/api/axios.client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ROUTES } from '@/router/routes';

function stepLabel(step: RecordingStep): string {
  switch (step.type) {
    case 'navigate':
      return `→ ${step.url}`;
    case 'click':
      return step.selector ? step.selector : `(${step.x}, ${step.y})`;
    case 'dblclick':
      return step.selector ? step.selector : `(${step.x}, ${step.y})`;
    case 'fill':
      return `"${step.value}" en ${step.selector}`;
    case 'type':
      return `"${step.value}"`;
    case 'press':
      return step.key ?? '';
    case 'select':
      return `"${step.value}"`;
    case 'hover':
      return step.selector ?? '';
    default:
      return '';
  }
}

function stepColor(type: string): string {
  const map: Record<string, string> = {
    navigate: 'text-espera-500',
    click: 'text-paso-500',
    dblclick: 'text-paso-500',
    fill: 'text-espera-500',
    type: 'text-espera-500',
    press: 'text-espera-500',
    select: 'text-espera-500',
    hover: 'text-tinta-500',
  };
  return map[type] ?? 'text-tinta-300';
}

function formatDuration(start: string, stop: string) {
  const s = Math.floor((new Date(stop).getTime() - new Date(start).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

interface Suite {
  id: string;
  name: string;
}

function ConvertModal({
  rec,
  onClose,
  onConverted,
}: {
  rec: Recording;
  onClose: () => void;
  onConverted: (testId: string) => void;
}) {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(rec.projectId);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [suiteId, setSuiteId] = useState('');
  const [testName, setTestName] = useState(`Grabación de ${new URL(rec.targetUrl).hostname}`);
  const [loading, setLoading] = useState(false);
  const [loadingSuites, setLoadingSuites] = useState(false);

  async function loadSuites(pid: string) {
    setLoadingSuites(true);
    setSuiteId('');
    try {
      const res = await api.get<Suite[]>(`/projects/${pid}/suites`);
      setSuites(res.data);
      if (res.data.length === 1) setSuiteId(res.data[0].id);
    } finally {
      setLoadingSuites(false);
    }
  }

  async function handleProjectChange(pid: string) {
    setSelectedProjectId(pid);
    if (pid) await loadSuites(pid);
    else setSuites([]);
  }

  // Load suites for initial project on mount
  useState(() => {
    if (selectedProjectId) loadSuites(selectedProjectId);
  });

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!suiteId || !testName) return;
    setLoading(true);
    try {
      const test = await convertRecordingToTest(rec.id, suiteId, testName);
      onConverted(test.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleConvert(e)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-tinta-700 mb-1">Nombre del test</label>
        <input
          required
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-tinta-700 mb-1">Proyecto</label>
        <select
          value={selectedProjectId}
          onChange={(e) => void handleProjectChange(e.target.value)}
          className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
        >
          <option value="">Selecciona un proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-tinta-700 mb-1">Suite de prueba</label>
        <select
          required
          value={suiteId}
          onChange={(e) => setSuiteId(e.target.value)}
          disabled={!selectedProjectId || loadingSuites}
          className="w-full rounded-lg border border-tinta-300 px-3 py-2 text-sm focus:border-oro-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">{loadingSuites ? 'Cargando…' : 'Selecciona una suite'}</option>
          {suites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedProjectId && !loadingSuites && suites.length === 0 && (
          <p className="mt-1 text-xs text-espera-500">
            Este proyecto no tiene suites. Crea una en la página del proyecto primero.
          </p>
        )}
      </div>
      <p className="text-xs text-tinta-500">
        Se crearán {rec.steps.length} pasos a partir de esta grabación.
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={!suiteId}>
          <Wand2 size={14} />
          Convertir en test
        </Button>
      </div>
    </form>
  );
}

function RecordingRow({ rec, onDeleted }: { rec: Recording; onDeleted: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleConverted(testId: string) {
    setConverting(false);
    navigate(ROUTES.TEST_DETAIL(testId));
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta grabación? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await deleteRecording(rec.id);
      onDeleted();
    } catch {
      alert('Error al eliminar la grabación');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-tinta-700 bg-tinta-800 overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-4 text-left min-w-0"
        >
          <Video size={16} className="text-oro-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{rec.targetUrl}</p>
            <p className="text-xs text-tinta-500">{rec.project.name}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-xs text-tinta-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(rec.startedAt, rec.stoppedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Globe size={12} />
              {rec.steps.length} pasos
            </span>
            <span className="hidden sm:block">{new Date(rec.stoppedAt).toLocaleString()}</span>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <Button size="sm" onClick={() => setConverting(true)} disabled={rec.steps.length === 0}>
          <Wand2 size={13} />
          Convertir
        </Button>
        <Button size="sm" variant="danger" onClick={() => void handleDelete()} loading={deleting}>
          <Trash2 size={13} />
        </Button>
      </div>

      {open && (
        <div className="border-t border-tinta-700 px-4 py-3 space-y-1 max-h-64 overflow-y-auto">
          {rec.steps.length === 0 ? (
            <p className="text-xs text-tinta-500 italic">Sin pasos capturados</p>
          ) : (
            rec.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-tinta-600 w-5 shrink-0 text-right">{i + 1}.</span>
                <span className={`font-medium shrink-0 ${stepColor(step.type)}`}>{step.type}</span>
                <span className="text-tinta-300 truncate">{stepLabel(step)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        open={converting}
        title="Convertir grabación en test"
        onClose={() => setConverting(false)}
      >
        <ConvertModal
          rec={rec}
          onClose={() => setConverting(false)}
          onConverted={handleConverted}
        />
      </Modal>
    </div>
  );
}

export default function RecordingsPage({ projectId }: { projectId?: string }) {
  const { recordings, loading, error, refetch } = useRecordings(projectId);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-oro-500 border-t-transparent" />
      </div>
    );
  if (error) return <p className="text-fallo-500 p-6">{error}</p>;

  return (
    <div className="space-y-4">
      {!projectId && (
        <div className="flex items-center gap-3">
          <Video size={22} className="text-oro-500" />
          <h1 className="text-xl font-bold text-white">Grabaciones</h1>
          <span className="ml-auto text-sm text-tinta-500">{recordings.length} grabaciones</span>
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-tinta-500">
          <Video size={36} className="text-tinta-600" />
          <p className="text-sm">No hay grabaciones todavía.</p>
          <p className="text-xs text-tinta-600">
            Inicia una sesión en el Grabador y haz click en Detener para guardar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recordings.map((rec) => (
            <RecordingRow key={rec.id} rec={rec} onDeleted={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
