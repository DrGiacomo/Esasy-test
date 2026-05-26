import { useState } from 'react';
import type { TestStep } from '@/types/models';

export function useFlowEditor(initialSteps: TestStep[]) {
  const [steps, setSteps] = useState<TestStep[]>([...initialSteps].sort((a, b) => a.order - b.order));
  const [selected, setSelected] = useState<TestStep | null>(null);

  function selectStep(step: TestStep | null) { setSelected(step); }

  function updateStep(id: string, changes: Partial<TestStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, ...changes } : s);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function reorder(from: number, to: number) {
    setSteps((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  return { steps, setSteps, selected, selectStep, updateStep, removeStep, reorder };
}
