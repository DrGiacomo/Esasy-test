import { Link } from 'react-router-dom';
import { FlaskConical, ChevronRight, Trash2 } from 'lucide-react';
import type { Test } from '@/types/models';
import { ROUTES } from '@/router/routes';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Props {
  test: Test;
  onArchive: (id: string) => void;
}

export function TestCard({ test, onArchive }: Props) {
  function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    if (window.confirm(`¿Eliminar el test "${test.name}"?`)) {
      onArchive(test.id);
    }
  }

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-linea bg-superficie hover:border-oro-300 hover:bg-sangre-50">
      <Link
        to={ROUTES.TEST_DETAIL(test.id)}
        className="flex flex-1 items-center gap-4 px-4 py-3 min-w-0"
      >
        <FlaskConical size={18} className="text-oro-500 shrink-0" />
        <span className="flex-1 text-sm font-medium text-texto truncate">{test.name}</span>
        <StatusBadge status={test.status} />
        <ChevronRight size={16} className="text-texto-tenue group-hover:text-oro-500 shrink-0" />
      </Link>
      <button
        onClick={handleArchive}
        className="shrink-0 mr-2 rounded-lg p-2 text-texto-tenue hover:bg-fallo-100 hover:text-fallo-500 transition-colors"
        title="Eliminar test"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
