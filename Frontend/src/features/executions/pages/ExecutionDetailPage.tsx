import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { executionsApi } from '../executions.api';
import { useExecutionSocket } from '../hooks/useExecutionSocket';
import type { Execution, ExecutionResult } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TestResultCard } from '../components/TestResultCard';
import { ExecutionProgressPanel } from '../components/ExecutionProgressPanel';
import { ROUTES } from '@/router/routes';
import { Button } from '@/components/ui/Button';

export default function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { events, status } = useExecutionSocket(executionId ?? '');

  useEffect(() => {
    if (!executionId) return;
    Promise.all([executionsApi.getOne(executionId), executionsApi.getResults(executionId)])
      .then(([ex, res]) => { setExecution(ex); setResults(res); })
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
  }, [executionId, execution?.status, status]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!execution) return <p className="text-gray-500">Ejecución no encontrada</p>;

  const displayStatus = status ?? execution.status;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Ejecución</h1>
          <StatusBadge status={displayStatus} />
        </div>
        <Link to={ROUTES.REPORT(execution.id)}>
          <Button variant="secondary" size="sm">
            <FileText size={14} />
            Ver reporte
          </Button>
        </Link>
      </div>

      {['QUEUED', 'PROVISIONING', 'RUNNING', 'COLLECTING'].includes(displayStatus) && (
        <ExecutionProgressPanel events={events} />
      )}

      <div className="space-y-3">
        {results.map((r) => <TestResultCard key={r.id} result={r} />)}
      </div>
    </div>
  );
}
