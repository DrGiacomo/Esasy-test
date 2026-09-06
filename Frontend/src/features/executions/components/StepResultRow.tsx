import type { StepResult } from '@/types/models';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function StepResultRow({ stepResult }: { stepResult: StepResult }) {
  return (
    <div className="flex items-center gap-3 rounded py-1.5 text-xs">
      <StatusBadge status={stepResult.status} />
      <span className="flex-1 text-texto-tenue">
        {stepResult.step?.description ?? stepResult.step?.action ?? 'paso'}
      </span>
      <span className="text-texto-tenue">{stepResult.durationMs}ms</span>
    </div>
  );
}
