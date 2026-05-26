import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronRight } from 'lucide-react';
import { executionsApi } from '../executions.api';
import type { Execution } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ROUTES } from '@/router/routes';

export default function ExecutionsListPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    executionsApi.getAll().then(setExecutions).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Ejecuciones</h1>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

      {!loading && executions.length === 0 && (
        <EmptyState
          icon={<Play size={48} />}
          title="Sin ejecuciones"
          description="Ejecuta un test desde la página de detalle para ver resultados aquí."
        />
      )}

      {!loading && executions.length > 0 && (
        <div className="space-y-2">
          {executions.map((e) => (
            <Link
              key={e.id}
              to={ROUTES.EXECUTION_DETAIL(e.id)}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50"
            >
              <StatusBadge status={e.status} />
              <span className="flex-1 text-sm text-gray-700 font-mono">{e.id.slice(0, 8)}…</span>
              <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
