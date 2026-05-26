import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit3, Play } from 'lucide-react';
import { testsApi } from '../tests.api';
import type { Test, TestStep } from '@/types/models';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StepList } from '../components/StepList';
import { ROUTES } from '@/router/routes';

export default function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const [test, setTest] = useState<(Test & { steps: TestStep[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId) return;
    testsApi.getOne(testId).then(setTest).finally(() => setLoading(false));
  }, [testId]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!test) return <p className="text-gray-500">Test no encontrado</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{test.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{test.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={test.status} />
          <Link to={ROUTES.FLOW_EDITOR(test.id)}>
            <Button variant="secondary" size="sm">
              <Edit3 size={14} />
              Editor visual
            </Button>
          </Link>
          <Button size="sm">
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

      {test.generatedCode && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Código generado (TypeScript)</h2>
          <pre className="overflow-x-auto text-xs text-gray-100">{test.generatedCode}</pre>
        </div>
      )}
    </div>
  );
}
