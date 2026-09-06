import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ExecutionResult } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StepResultRow } from './StepResultRow';
import { ArtifactViewer } from '@/features/reports/components/ArtifactViewer';

export function TestResultCard({ result }: { result: ExecutionResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-linea bg-superficie overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-superficie"
      >
        <StatusBadge status={result.status} />
        <span className="flex-1 text-sm font-medium text-texto">
          {result.test?.name ?? result.testId.slice(0, 8)}
        </span>
        {result.durationMs && (
          <span className="text-xs text-texto-tenue">{(result.durationMs / 1000).toFixed(1)}s</span>
        )}
        {open ? (
          <ChevronDown size={16} className="text-texto-tenue" />
        ) : (
          <ChevronRight size={16} className="text-texto-tenue" />
        )}
      </button>

      {open && (
        <div className="border-t border-linea px-4 py-3">
          {result.errorMessage && (
            <p className="mb-2 rounded bg-fallo-100 px-3 py-2 text-xs text-fallo-500">
              {result.errorMessage}
            </p>
          )}
          <ArtifactViewer
            screenshotUrl={result.screenshotUrl ?? null}
            videoUrl={result.videoUrl ?? null}
            traceUrl={result.traceUrl ?? null}
          />
          {result.stepResults && result.stepResults.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.stepResults.map((sr) => (
                <StepResultRow key={sr.id} stepResult={sr} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
