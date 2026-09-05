import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ExecutionResult } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StepResultRow } from './StepResultRow';
import { ArtifactViewer } from '@/features/reports/components/ArtifactViewer';

export function TestResultCard({ result }: { result: ExecutionResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50"
      >
        <StatusBadge status={result.status} />
        <span className="flex-1 text-sm font-medium text-gray-800">
          {result.test?.name ?? result.testId.slice(0, 8)}
        </span>
        {result.durationMs && (
          <span className="text-xs text-gray-400">{(result.durationMs / 1000).toFixed(1)}s</span>
        )}
        {open ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          {result.errorMessage && (
            <p className="mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-600">
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
