import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAiAssistant } from '../hooks/useAiAssistant';

interface Props { projectId: string; onGenerated: (steps: unknown[]) => void }

export function NlToFlowInput({ projectId, onGenerated }: Props) {
  const [prompt, setPrompt] = useState('');
  const { loading, nlToFlow } = useAiAssistant();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    const steps = await nlToFlow(prompt, projectId);
    if (steps) { onGenerated(steps); setPrompt(''); }
  }

  return (
    <form onSubmit={(e) => void handle(e)} className="flex gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <Wand2 size={18} className="mt-1 flex-shrink-0 text-indigo-500" />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="Describe el flujo en lenguaje natural, ej: «Ir al login, escribir usuario y contraseña, hacer clic en entrar y verificar el dashboard»"
        className="flex-1 resize-none bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
      />
      <Button size="sm" type="submit" loading={loading} className="self-end">
        Generar
      </Button>
    </form>
  );
}
