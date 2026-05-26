import { Trash2 } from 'lucide-react';
import type { TestStep } from '@/types/models';
import { testsApi } from '../tests.api';

interface Props { steps: TestStep[]; testId: string; onUpdate: () => void }

const ACTION_LABELS: Record<string, string> = {
  navigate: 'Navegar',
  click: 'Hacer clic',
  dblclick: 'Doble clic',
  fill: 'Escribir',
  press: 'Tecla',
  hover: 'Pasar el cursor',
  select: 'Seleccionar',
  assert_visible: 'Verificar visible',
  assert_text: 'Verificar texto',
  screenshot: 'Captura de pantalla',
  wait: 'Esperar',
};

export function StepList({ steps, testId, onUpdate }: Props) {
  async function handleDelete(stepId: string) {
    await testsApi.deleteStep(testId, stepId);
    onUpdate();
  }

  if (steps.length === 0) {
    return <p className="text-sm text-gray-400">Sin pasos. Usa el editor visual o el grabador para añadir pasos.</p>;
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span className="w-6 text-center text-xs font-mono text-gray-400">{i + 1}</span>
          <span className="w-24 font-medium text-indigo-600">{ACTION_LABELS[step.action] ?? step.action}</span>
          <span className="flex-1 truncate text-gray-700 font-mono text-xs">
            {step.selector ?? step.value ?? ''}
          </span>
          <button
            onClick={() => void handleDelete(step.id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
