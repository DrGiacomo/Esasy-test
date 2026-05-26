import type { TestStep } from '@/types/models';

interface Props { step: TestStep | null; onChange: (changes: Partial<TestStep>) => void }

const FIELDS: Record<string, { key: keyof TestStep; label: string; placeholder: string }[]> = {
  navigate: [{ key: 'selector', label: 'URL', placeholder: 'https://...' }],
  click: [
    { key: 'selector', label: 'Selector CSS / XPath', placeholder: 'button#submit' },
    { key: 'description', label: 'Descripción', placeholder: 'Botón de enviar' },
  ],
  fill: [
    { key: 'selector', label: 'Selector', placeholder: 'input[name="email"]' },
    { key: 'value', label: 'Valor', placeholder: 'texto a escribir' },
  ],
  press: [{ key: 'value', label: 'Tecla', placeholder: 'Enter, Tab, Escape...' }],
  select: [
    { key: 'selector', label: 'Selector', placeholder: 'select#country' },
    { key: 'value', label: 'Opción', placeholder: 'España' },
  ],
  assert_visible: [{ key: 'selector', label: 'Selector', placeholder: '.modal' }],
  assert_text: [
    { key: 'selector', label: 'Selector', placeholder: 'h1' },
    { key: 'value', label: 'Texto esperado', placeholder: 'Bienvenido' },
  ],
  screenshot: [{ key: 'description', label: 'Descripción', placeholder: 'Captura del resultado' }],
};

export function StepInspector({ step, onChange }: Props) {
  if (!step) {
    return (
      <div className="flex w-64 items-center justify-center border-l border-gray-200 bg-white p-6">
        <p className="text-center text-sm text-gray-400">Selecciona un paso para editarlo</p>
      </div>
    );
  }

  const fields = FIELDS[step.action] ?? [];

  return (
    <div className="w-64 border-l border-gray-200 bg-white p-4">
      <p className="mb-4 text-sm font-semibold text-gray-800">Paso: {step.action}</p>
      <div className="space-y-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
            <input
              value={String(step[key] ?? '')}
              onChange={(e) => onChange({ [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
