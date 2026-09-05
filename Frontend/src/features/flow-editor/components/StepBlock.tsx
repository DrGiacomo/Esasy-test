import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { TestStep } from '@/types/models';
import { describeStep } from '@/lib/describe-step';
import { useUiMode } from '@/hooks/useUiMode';

const ACTION_COLORS: Record<string, string> = {
  navigate: 'bg-blue-100 text-blue-700 border-blue-200',
  click: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  fill: 'bg-purple-100 text-purple-700 border-purple-200',
  assert_visible: 'bg-orange-100 text-orange-700 border-orange-200',
  assert_text: 'bg-orange-100 text-orange-700 border-orange-200',
  screenshot: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface Props {
  step: TestStep;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function StepBlock({ step, isSelected, onSelect, onRemove }: Props) {
  const { sencillo } = useUiMode();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorCls = ACTION_COLORS[step.action] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={16} />
      </button>

      <span className={`rounded px-2 py-0.5 text-xs font-medium border ${colorCls}`}>{step.action}</span>

      {/* En SENCILLO, la frase; en COMPLEJO, el selector como siempre. */}
      {sencillo ? (
        <span className="flex-1 truncate text-sm text-gray-700">{describeStep(step)}</span>
      ) : (
        <span className="flex-1 truncate font-mono text-xs text-gray-700">
          {step.selector ?? step.value ?? step.description ?? ''}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
