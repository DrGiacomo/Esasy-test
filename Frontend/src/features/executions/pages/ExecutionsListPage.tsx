import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronRight, XCircle, Trash2 } from 'lucide-react';
import { executionsApi } from '../executions.api';
import type { Execution } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/router/routes';

const ACTIVE_STATUSES = ['QUEUED', 'PROVISIONING', 'RUNNING', 'COLLECTING'];

export default function ExecutionsListPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    executionsApi
      .getAll()
      .then(setExecutions)
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(e: React.MouseEvent, execution: Execution) {
    e.preventDefault();
    const isActive = ACTIVE_STATUSES.includes(execution.status);
    const msg = isActive
      ? '¿Cancelar esta ejecución en progreso?'
      : '¿Eliminar esta ejecución? Esta acción no se puede deshacer.';
    if (!window.confirm(msg)) return;
    setActionId(execution.id);
    try {
      await executionsApi.cancel(execution.id);
      setExecutions((prev) => prev.filter((ex) => ex.id !== execution.id));
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-texto">Ejecuciones</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {!loading && executions.length === 0 && (
        <EmptyState
          icon={<Play size={48} />}
          title="Sin ejecuciones"
          description="Ejecuta un test desde la página de detalle para ver resultados aquí."
        />
      )}

      {!loading && executions.length > 0 && (
        <div className="space-y-2">
          {executions.map((e) => {
            const isActive = ACTIVE_STATUSES.includes(e.status);
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-lg border border-linea bg-superficie px-4 py-3 hover:border-sangre-200"
              >
                <Link
                  to={ROUTES.EXECUTION_DETAIL(e.id)}
                  className="flex flex-1 items-center gap-4 min-w-0"
                >
                  <StatusBadge status={e.status} />
                  <span className="flex-1 text-sm text-texto font-mono">
                    {e.id.slice(0, 8)}…
                  </span>
                  <span className="text-xs text-texto-tenue">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                  <ChevronRight size={16} className="text-texto-tenue" />
                </Link>
                <Button
                  size="sm"
                  variant={isActive ? 'secondary' : 'danger'}
                  loading={actionId === e.id}
                  onClick={(ev) => void handleRemove(ev, e)}
                >
                  {isActive ? <XCircle size={13} /> : <Trash2 size={13} />}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
