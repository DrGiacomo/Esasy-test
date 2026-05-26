import { Link } from 'react-router-dom';
import { Globe, ChevronRight } from 'lucide-react';
import type { Project } from '@/types/models';
import { ROUTES } from '@/router/routes';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={ROUTES.PROJECT_DETAIL(project.id)}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Globe size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{project.name}</p>
        <p className="text-xs text-gray-500 truncate">{project.baseUrl}</p>
      </div>
      <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
    </Link>
  );
}
