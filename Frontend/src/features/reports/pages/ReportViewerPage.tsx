import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api/axios.client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ReportSummary } from '../components/ReportSummary';
import { TestResultCard } from '@/features/executions/components/TestResultCard';
import type { ExecutionResult } from '@/types/models';

interface Report {
  executionId: string;
  project: { id: string; name: string; baseUrl: string };
  status: string;
  triggeredBy: string;
  startedAt: string | null;
  completedAt: string | null;
  summary: { total: number; passed: number; failed: number; totalDurationMs: number };
  results: ExecutionResult[];
}

export default function ReportViewerPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!executionId) return;
    api
      .get<Report>(`/reports/${executionId}`)
      .then((r) => setReport(r.data))
      .finally(() => setLoading(false));
  }, [executionId]);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  if (!report) return <p className="text-tinta-500">Reporte no encontrado</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-tinta-900">Reporte de ejecución</h1>
        <p className="text-sm text-tinta-500">
          {report.project.name} — {report.project.baseUrl}
        </p>
      </div>

      <ReportSummary
        summary={report.summary}
        status={report.status}
        startedAt={report.startedAt}
        completedAt={report.completedAt}
      />

      <div className="mt-6 space-y-3">
        {report.results.map((r) => (
          <TestResultCard key={r.id} result={r} />
        ))}
      </div>
    </div>
  );
}
