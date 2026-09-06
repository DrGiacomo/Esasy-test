interface Event {
  event: string;
  testId?: string;
  status?: string;
  timestamp: number;
}

export function ExecutionProgressPanel({ events }: { events: Event[] }) {
  return (
    <div className="mb-4 rounded-xl border border-espera-100 bg-espera-100 p-4">
      <p className="mb-2 text-sm font-semibold text-espera-500">Ejecución en progreso...</p>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {events.map((e, i) => (
          <p key={i} className="text-xs text-espera-500 font-mono">
            [{new Date(e.timestamp).toLocaleTimeString()}] {e.event}
            {e.status ? ` → ${e.status}` : ''}
          </p>
        ))}
      </div>
    </div>
  );
}
