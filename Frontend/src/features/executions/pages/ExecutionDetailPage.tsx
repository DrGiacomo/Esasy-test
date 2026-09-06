import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FileText, XCircle, WifiOff } from 'lucide-react';
import { executionsApi } from '../executions.api';
import { useExecutionSocket } from '../hooks/useExecutionSocket';
import type { Execution, ExecutionResult } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TestResultCard } from '../components/TestResultCard';
import { ExecutionProgressPanel } from '../components/ExecutionProgressPanel';
import { ROUTES } from '@/router/routes';
import { Button } from '@/components/ui/Button';

const ACTIVE_STATUSES = ['QUEUED', 'PROVISIONING', 'RUNNING', 'COLLECTING'];

export default function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const { events, status, connected } = useExecutionSocket(executionId ?? '');

  useEffect(() => {
    if (!executionId) return;
    Promise.all([executionsApi.getOne(executionId), executionsApi.getResults(executionId)])
      .then(([ex, res]) => {
        setExecution(ex);
        setResults(res);
      })
      .finally(() => setLoading(false));
  }, [executionId]);

  // Refetch results cuando la ejecución completa vía WebSocket
  useEffect(() => {
    if ((status === 'COMPLETED' || status === 'FAILED') && executionId) {
      executionsApi.getResults(executionId).then(setResults);
    }
  }, [status, executionId]);

  // Polling de respaldo: si la ejecución sigue activa y el socket no actualizó, refetch cada 3s
  useEffect(() => {
    if (!executionId || !execution) return;
    const active = ['QUEUED', 'PROVISIONING', 'RUNNING', 'COLLECTING'];
    if (!active.includes(execution.status) && !active.includes(status ?? '')) return;

    const interval = setInterval(async () => {
      const updated = await executionsApi.getOne(executionId);
      setExecution(updated);
      if (!active.includes(updated.status)) {
        const res = await executionsApi.getResults(executionId);
        setResults(res);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
    // La regla pide `execution` entera en las dependencias, y no puede tenerla: este
    // efecto ESCRIBE `execution` en cada vuelta del sondeo. Ponerla lo reiniciaría sin
    // parar. Lo que de verdad debe reiniciarlo es que cambie el estado, y eso sí está.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, execution?.status, status]);

  async function handleCancel() {
    if (!executionId) return;
    if (!window.confirm('¿Cancelar esta ejecución en progreso?')) return;
    setCancelling(true);
    try {
      await executionsApi.cancel(executionId);
      navigate(-1);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setCancelling(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  if (!execution) return <p className="text-texto-tenue">Ejecución no encontrada</p>;

  const displayStatus = status ?? execution.status;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-texto">Ejecución</h1>
          <StatusBadge status={displayStatus} />
        </div>
        <div className="flex items-center gap-2">
          {ACTIVE_STATUSES.includes(displayStatus) && (
            <Button
              variant="danger"
              size="sm"
              loading={cancelling}
              onClick={() => void handleCancel()}
            >
              <XCircle size={14} />
              Cancelar
            </Button>
          )}
          <Link to={ROUTES.REPORT(execution.id)}>
            <Button variant="secondary" size="sm">
              <FileText size={14} />
              Ver reporte
            </Button>
          </Link>
        </div>
      </div>

      {!connected && ACTIVE_STATUSES.includes(displayStatus) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-espera-100 bg-espera-100 px-4 py-2 text-sm text-espera-500">
          <WifiOff size={14} className="shrink-0 animate-pulse" />
          Reconectando… los resultados siguen actualizándose en segundo plano.
        </div>
      )}

      {ACTIVE_STATUSES.includes(displayStatus) && <ExecutionProgressPanel events={events} />}

      <div className="space-y-3">
        {results.map((r) => (
          <TestResultCard key={r.id} result={r} />
        ))}
      </div>
    </div>
  );
}
