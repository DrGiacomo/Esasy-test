import { Trash2 } from 'lucide-react';
import type { TestStep } from '@/types/models';
import { describeStep, technicalDetail } from '@/lib/describe-step';
import { useUiMode } from '@/hooks/useUiMode';
import { testsApi } from '../tests.api';

interface Props {
  steps: TestStep[];
  testId: string;
  onUpdate: () => void;
}

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
  const { sencillo } = useUiMode();

  async function handleDelete(stepId: string) {
    await testsApi.deleteStep(testId, stepId);
    onUpdate();
  }

  if (steps.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Sin pasos. Usa el editor visual o el grabador para añadir pasos.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const detalle = technicalDetail(step);
        return (
          <div key={step.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-xs font-mono text-gray-400">{i + 1}</span>
              <span className="w-24 font-medium text-indigo-600">
                {ACTION_LABELS[step.action] ?? step.action}
              </span>
              {/*
                En SENCILLO se cuenta el paso como una frase; en COMPLEJO se mantiene
                exactamente lo de antes, el selector en monoespaciada.
              */}
              {sencillo ? (
                <span className="flex-1 truncate text-gray-700">{describeStep(step)}</span>
              ) : (
                <span className="flex-1 truncate font-mono text-xs text-gray-700">
                  {step.selector ?? step.value ?? ''}
                </span>
              )}
              <button
                onClick={() => void handleDelete(step.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {/* Escondido, nunca inaccesible: el detalle esta a un clic tambien en SENCILLO. */}
            {sencillo && detalle && (
              <details className="ml-9 mt-1">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                  ver detalle tecnico
                </summary>
                <p className="mt-1 font-mono text-xs text-gray-500">{detalle}</p>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
