import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { projectsApi } from '../projects.api';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProjectsListPage() {
  const { projects, loading, error, refetch } = useProjects();
  const [showModal, setShowModal] = useState(false);

  async function handleArchive(id: string) {
    await projectsApi.archive(id);
    refetch();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Proyectos</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Nuevo proyecto
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No hay proyectos todavía"
          description="Crea tu primer proyecto para empezar a automatizar pruebas."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Crear proyecto
            </Button>
          }
        />
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onArchive={(id) => void handleArchive(id)} />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={refetch}
      />
    </div>
  );
}
