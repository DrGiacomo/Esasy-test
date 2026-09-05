import { Link } from 'react-router-dom';
import { Globe, ChevronRight, Trash2 } from 'lucide-react';
import type { Project } from '@/types/models';
import { ROUTES } from '@/router/routes';

interface Props {
  project: Project;
  onArchive: (id: string) => void;
}

export function ProjectCard({ project, onArchive }: Props) {
  function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    if (
      window.confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)
    ) {
      onArchive(project.id);
    }
  }

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
      <Link
        to={ROUTES.PROJECT_DETAIL(project.id)}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
          <Globe size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{project.name}</p>
          <p className="text-xs text-gray-500 truncate">{project.baseUrl}</p>
        </div>
        <ChevronRight
          size={18}
          className="text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0"
        />
      </Link>
      <button
        onClick={handleArchive}
        className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        title="Eliminar proyecto"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
