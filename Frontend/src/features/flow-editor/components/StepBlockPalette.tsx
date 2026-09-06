import { MousePointer2, Type, Globe, Eye, Camera, Keyboard, ChevronDown } from 'lucide-react';

const STEP_TYPES = [
  { action: 'navigate', label: 'Navegar', icon: Globe, description: 'Ir a una URL' },
  { action: 'click', label: 'Clic', icon: MousePointer2, description: 'Hacer clic en un elemento' },
  { action: 'fill', label: 'Escribir', icon: Type, description: 'Escribir en un campo' },
  { action: 'press', label: 'Tecla', icon: Keyboard, description: 'Presionar una tecla' },
  {
    action: 'select',
    label: 'Seleccionar',
    icon: ChevronDown,
    description: 'Seleccionar opción de lista',
  },
  {
    action: 'assert_visible',
    label: 'Verificar visible',
    icon: Eye,
    description: 'Verificar que un elemento es visible',
  },
  {
    action: 'assert_text',
    label: 'Verificar texto',
    icon: Eye,
    description: 'Verificar el contenido de texto',
  },
  {
    action: 'screenshot',
    label: 'Captura',
    icon: Camera,
    description: 'Tomar captura de pantalla',
  },
];

interface Props {
  onAdd: (action: string) => void;
}

export function StepBlockPalette({ onAdd }: Props) {
  return (
    <div className="w-48 border-r border-linea bg-superficie p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-texto-tenue">
        Pasos disponibles
      </p>
      <div className="space-y-1">
        {STEP_TYPES.map(({ action, label, icon: Icon, description }) => (
          <button
            key={action}
            onClick={() => onAdd(action)}
            title={description}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-texto hover:bg-sangre-50 hover:text-sangre-700"
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
