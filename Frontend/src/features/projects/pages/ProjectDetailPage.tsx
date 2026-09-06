import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, FolderOpen, Film } from 'lucide-react';
import { projectsApi } from '../projects.api';
import type { Project, TestSuite } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { ROUTES } from '@/router/routes';
import RecordingsPage from '@/features/recorder/pages/RecordingsPage';

type Tab = 'suites' | 'recordings';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('suites');
  const [showModal, setShowModal] = useState(false);
  const [suiteName, setSuiteName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([projectsApi.getOne(projectId), projectsApi.getSuites(projectId)])
      .then(([p, s]) => {
        setProject(p);
        setSuites(s);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  async function createSuite(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !suiteName) return;
    setCreating(true);
    try {
      const suite = await projectsApi.createSuite(projectId, { name: suiteName });
      setSuites((p) => [...p, suite]);
      setShowModal(false);
      setSuiteName('');
    } finally {
      setCreating(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  if (!project) return <p className="text-texto-tenue">Proyecto no encontrado</p>;

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-texto-tenue">{project.baseUrl}</p>
        <h1 className="text-xl font-bold text-texto">{project.name}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-linea">
        <button
          onClick={() => setTab('suites')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'suites'
              ? 'border-sangre-600 text-sangre-600'
              : 'border-transparent text-texto-tenue hover:text-texto'
          }`}
        >
          <FolderOpen size={15} />
          Suites
        </button>
        <button
          onClick={() => setTab('recordings')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'recordings'
              ? 'border-sangre-600 text-sangre-600'
              : 'border-transparent text-texto-tenue hover:text-texto'
          }`}
        >
          <Film size={15} />
          Grabaciones
        </button>
      </div>

      {/* Suites tab */}
      {tab === 'suites' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-texto-tenue">{suites.length} suites</span>
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus size={14} />
              Nueva suite
            </Button>
          </div>

          {suites.length === 0 ? (
            <p className="text-sm text-texto-tenue">Sin suites todavía.</p>
          ) : (
            <div className="space-y-2">
              {suites.map((s) => (
                <Link
                  key={s.id}
                  to={ROUTES.TESTS(s.id)}
                  className="flex items-center gap-3 rounded-lg border border-linea bg-superficie px-4 py-3 text-sm font-medium text-texto hover:border-oro-300 hover:bg-sangre-50"
                >
                  <FolderOpen size={16} className="text-oro-500" />
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          <Modal open={showModal} title="Nueva suite" onClose={() => setShowModal(false)}>
            <form onSubmit={(e) => void createSuite(e)} className="space-y-4">
              <input
                required
                value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)}
                className="w-full rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
                placeholder="Nombre de la suite"
              />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={creating}>
                  Crear
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* Grabaciones tab */}
      {tab === 'recordings' && projectId && <RecordingsPage projectId={projectId} />}
    </div>
  );
}
