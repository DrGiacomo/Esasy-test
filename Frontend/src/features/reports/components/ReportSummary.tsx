import { CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Summary { total: number; passed: number; failed: number; totalDurationMs: number }

interface Props { summary: Summary; status: string; startedAt: string | null; completedAt: string | null }

export function ReportSummary({ summary, status, startedAt, completedAt }: Props) {
  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const durationSec = (summary.totalDurationMs / 1000).toFixed(1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <BarChart3 size={20} className="text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Resumen</h2>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-emerald-600">
            <CheckCircle size={18} />{summary.passed}
          </p>
          <p className="text-xs text-gray-500">Pasados</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600">
            <XCircle size={18} />{summary.failed}
          </p>
          <p className="text-xs text-gray-500">Fallidos</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-700">
            <Clock size={18} />{durationSec}s
          </p>
          <p className="text-xs text-gray-500">Duración</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>Tasa de éxito</span><span>{passRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${passRate}%` }} />
        </div>
      </div>

      {startedAt && (
        <p className="mt-3 text-xs text-gray-400">
          Iniciado: {new Date(startedAt).toLocaleString()}
          {completedAt && ` — Completado: ${new Date(completedAt).toLocaleString()}`}
        </p>
      )}
    </div>
  );
}
