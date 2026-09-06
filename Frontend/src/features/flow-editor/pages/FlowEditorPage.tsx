import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { testsApi } from '@/features/tests/tests.api';
import type { Test, TestStep } from '@/types/models';
import { useFlowEditor } from '../hooks/useFlowEditor';
import { FlowCanvas } from '../components/FlowCanvas';
import { StepBlockPalette } from '../components/StepBlockPalette';
import { StepInspector } from '../components/StepInspector';
import { CodePreviewPanel } from '../components/CodePreviewPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useUiMode } from '@/hooks/useUiMode';

export default function FlowEditorPage() {
  const { sencillo } = useUiMode();
  const { testId } = useParams<{ testId: string }>();
  const [test, setTest] = useState<(Test & { steps: TestStep[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { steps, setSteps, selected, selectStep, updateStep, removeStep, reorder } = useFlowEditor(
    [],
  );

  useEffect(() => {
    if (!testId) return;
    testsApi
      .getOne(testId)
      .then((t) => {
        setTest(t);
        setSteps([...t.steps].sort((a, b) => a.order - b.order));
      })
      .finally(() => setLoading(false));
  }, [testId, setSteps]);

  async function addStep(action: string) {
    if (!testId) return;
    const step = await testsApi.createStep(testId, {
      action,
      order: steps.length + 1,
    });
    setSteps((prev) => [...prev, step]);
  }

  async function handleSave() {
    if (!testId) return;
    setSaving(true);
    try {
      await testsApi.reorderSteps(
        testId,
        steps.map((s) => ({ stepId: s.id, order: s.order })),
      );
      for (const step of steps) {
        await testsApi.updateStep(testId, step.id, {
          selector: step.selector ?? undefined,
          value: step.value ?? undefined,
          description: step.description ?? undefined,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  if (!test) return <p>Test no encontrado</p>;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-linea bg-superficie px-6 py-3">
        <div>
          <h1 className="text-base font-semibold text-texto">{test.name}</h1>
          <p className="text-xs text-texto-tenue">Editor visual — {steps.length} pasos</p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-sangre-600 px-4 py-2 text-sm font-medium text-white hover:bg-sangre-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar cambios
        </button>
      </div>

      {/* Editor layout */}
      <div className="flex flex-1 overflow-hidden">
        <StepBlockPalette onAdd={(action) => void addStep(action)} />
        <FlowCanvas
          steps={steps}
          selectedId={selected?.id ?? null}
          onSelect={selectStep}
          onRemove={removeStep}
          onReorder={reorder}
        />
        <StepInspector
          step={selected}
          onChange={(changes) => {
            if (selected) updateStep(selected.id, changes);
          }}
        />
      </div>

      {!sencillo && <CodePreviewPanel code={test.generatedCode} />}
    </div>
  );
}
