import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { TestStep } from '@/types/models';
import { describeStep } from '@/lib/describe-step';
import { useUiMode } from '@/hooks/useUiMode';

const ACTION_COLORS: Record<string, string> = {
  navigate: 'bg-espera-100 text-espera-500 border-espera-100',
  click: 'bg-paso-100 text-paso-500 border-paso-100',
  fill: 'bg-espera-100 text-espera-500 border-espera-100',
  assert_visible: 'bg-espera-100 text-espera-500 border-espera-100',
  assert_text: 'bg-espera-100 text-espera-500 border-espera-100',
  screenshot: 'bg-superficie-2 text-texto-tenue border-linea',
};

interface Props {
  step: TestStep;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function StepBlock({ step, isSelected, onSelect, onRemove }: Props) {
  const { sencillo } = useUiMode();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorCls = ACTION_COLORS[step.action] ?? 'bg-superficie-2 text-texto-tenue border-linea';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-oro-500 ring-2 ring-sangre-200'
          : 'border-linea bg-superficie hover:border-linea'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-texto-tenue hover:text-texto-tenue"
      >
        <GripVertical size={16} />
      </button>

      <span className={`rounded px-2 py-0.5 text-xs font-medium border ${colorCls}`}>
        {step.action}
      </span>

      {/* En SENCILLO, la frase; en COMPLEJO, el selector como siempre. */}
      {sencillo ? (
        <span className="flex-1 truncate text-sm text-texto">{describeStep(step)}</span>
      ) : (
        <span className="flex-1 truncate font-mono text-xs text-texto">
          {step.selector ?? step.value ?? step.description ?? ''}
        </span>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="rounded p-1 text-tinta-300 hover:bg-fallo-100 hover:text-fallo-500"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
