import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TestStep } from '@/types/models';
import { StepBlock } from './StepBlock';

interface Props {
  steps: TestStep[];
  selectedId: string | null;
  onSelect: (step: TestStep) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}

export function FlowCanvas({ steps, selectedId, onSelect, onRemove, onReorder }: Props) {
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = steps.findIndex((s) => s.id === active.id);
    const to = steps.findIndex((s) => s.id === over.id);
    onReorder(from, to);
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {steps.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">Arrastra pasos desde el panel izquierdo o haz clic para añadirlos</p>
            </div>
          ) : (
            <div className="mx-auto max-w-xl space-y-2">
              {steps.map((step) => (
                <StepBlock
                  key={step.id}
                  step={step}
                  isSelected={selectedId === step.id}
                  onSelect={() => onSelect(step)}
                  onRemove={() => onRemove(step.id)}
                />
              ))}
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
