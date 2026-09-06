import type { CapturedStep } from '../recorder.types';

export function ActionFeedOverlay({ steps }: { steps: CapturedStep[] }) {
  if (steps.length === 0) return null;

  const last = steps[steps.length - 1];

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 rounded-lg bg-black/70 px-4 py-2 text-xs text-white backdrop-blur">
      <span className="font-medium text-oro-300">{last.type}</span>
      {last.selector && <span className="ml-2 text-tinta-300 font-mono">{last.selector}</span>}
      {last.url && <span className="ml-2 text-tinta-300">{last.url}</span>}
      <span className="ml-3 text-texto-tenue">{steps.length} acciones capturadas</span>
    </div>
  );
}
