import { CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Summary {
  total: number;
  passed: number;
  failed: number;
  totalDurationMs: number;
}

interface Props {
  summary: Summary;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export function ReportSummary({ summary, status, startedAt, completedAt }: Props) {
  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const durationSec = (summary.totalDurationMs / 1000).toFixed(1);

  return (
    <div className="rounded-xl border border-linea bg-superficie p-6">
      <div className="mb-4 flex items-center gap-3">
        <BarChart3 size={20} className="text-sangre-600" />
        <h2 className="font-semibold text-texto">Resumen</h2>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-texto">{summary.total}</p>
          <p className="text-xs text-texto-tenue">Total</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-paso-500">
            <CheckCircle size={18} />
            {summary.passed}
          </p>
          <p className="text-xs text-texto-tenue">Pasados</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-fallo-500">
            <XCircle size={18} />
            {summary.failed}
          </p>
          <p className="text-xs text-texto-tenue">Fallidos</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-texto">
            <Clock size={18} />
            {durationSec}s
          </p>
          <p className="text-xs text-texto-tenue">Duración</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-texto-tenue">
          <span>Tasa de éxito</span>
          <span>{passRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-superficie-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-paso-500 transition-all"
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>

      {startedAt && (
        <p className="mt-3 text-xs text-texto-tenue">
          Iniciado: {new Date(startedAt).toLocaleString()}
          {completedAt && ` — Completado: ${new Date(completedAt).toLocaleString()}`}
        </p>
      )}
    </div>
  );
}
