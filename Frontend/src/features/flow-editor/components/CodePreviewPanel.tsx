import { useState } from 'react';
import { Code2, ChevronUp, ChevronDown } from 'lucide-react';

export function CodePreviewPanel({ code }: { code: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-linea">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 bg-tinta-800 px-4 py-2 text-xs font-medium text-tinta-300 hover:bg-tinta-700"
      >
        <Code2 size={14} />
        <span>Código TypeScript (Power Users)</span>
        {open ? (
          <ChevronDown size={14} className="ml-auto" />
        ) : (
          <ChevronUp size={14} className="ml-auto" />
        )}
      </button>
      {open && (
        <pre className="max-h-64 overflow-auto bg-tinta-900 p-4 text-xs text-tinta-200">
          {code ?? '// El código se genera al guardar los pasos'}
        </pre>
      )}
    </div>
  );
}
