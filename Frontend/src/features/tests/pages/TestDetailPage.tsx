import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit3, Play } from 'lucide-react';
import { testsApi } from '../tests.api';
import { executionsApi } from '@/features/executions/executions.api';
import { api } from '@/lib/api/axios.client';
import type { Test, TestStep } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StepList } from '../components/StepList';
import { ROUTES } from '@/router/routes';
import { useUiMode } from '@/hooks/useUiMode';

export default function TestDetailPage() {
  const { sencillo } = useUiMode();
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<
    (Test & { steps: TestStep[]; suite?: { projectId: string } }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!testId) return;
    testsApi
      .getOne(testId)
      .then(setTest)
      .finally(() => setLoading(false));
  }, [testId]);

  async function handleRun() {
    if (!test) return;
    setRunning(true);
    try {
      // Get projectId from suite (included in response), or fetch from suite endpoint as fallback
      let projectId = test.suite?.projectId;
      if (!projectId) {
        const suite = await api
          .get<{ projectId: string }>(`/suites/${test.suiteId}`)
          .then((r) => r.data);
        projectId = suite.projectId;
      }
      if (test.status !== 'ACTIVE') {
        const updated = await testsApi.update(test.id, { status: 'ACTIVE' });
        setTest((prev) => (prev ? { ...prev, status: updated.status } : prev));
      }
      const execution = await executionsApi.trigger({
        projectId,
        suiteId: test.suiteId,
        testId: test.id,
      });
      navigate(`/executions/${execution.id}`);
    } catch (err) {
      alert(`Error al ejecutar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  if (!test) return <p className="text-gray-500">Test no encontrado</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{test.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{test.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={test.status}
            onChange={async (e) => {
              const updated = await testsApi.update(test.id, { status: e.target.value });
              setTest((prev) => (prev ? { ...prev, status: updated.status } : prev));
            }}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
          </select>
          <Link to={ROUTES.FLOW_EDITOR(test.id)}>
            <Button variant="secondary" size="sm">
              <Edit3 size={14} />
              Editor visual
            </Button>
          </Link>
          <Button size="sm" onClick={() => void handleRun()} loading={running}>
            <Play size={14} />
            Ejecutar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Pasos ({test.steps.length})</h2>
        <StepList
          steps={test.steps}
          testId={test.id}
          onUpdate={() => {
            if (testId) testsApi.getOne(testId).then(setTest);
          }}
        />
      </div>

      {/*
        La documentacion en lenguaje llano va ANTES que el codigo y se ve en los dos
        modos: es el artefacto pensado para quien no programa (§3, «IA Contextual»).
      */}
      {test.documentation && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Qué hace esta prueba</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {test.documentation}
          </div>
          {test.documentedAt && (
            <p className="mt-3 text-xs text-gray-400">
              Generado por IA el {new Date(test.documentedAt).toLocaleString('es-ES')}. Si los pasos
              cambiaron después, vuelve a generarla.
            </p>
          )}
        </div>
      )}

      {/* El codigo TypeScript es lo primero que el §2.1 dice no ensenar en modo sencillo. */}
      {!sencillo && test.generatedCode && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Código generado (TypeScript)</h2>
          <pre className="overflow-x-auto text-xs text-gray-100">{test.generatedCode}</pre>
        </div>
      )}
    </div>
  );
}
