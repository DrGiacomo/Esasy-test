import { useState } from 'react';
import { Square, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  onNavigate: (url: string) => void;
  onStop: () => void;
  loading: boolean;
}

export function RecorderToolbar({ onNavigate, onStop, loading }: Props) {
  const [url, setUrl] = useState('');

  function handleNavigate(e: React.FormEvent) {
    e.preventDefault();
    if (url) onNavigate(url);
  }

  return (
    <div className="flex items-center gap-3 border-b border-tinta-700 bg-tinta-800 px-4 py-2">
      <form onSubmit={handleNavigate} className="flex flex-1 items-center gap-2">
        <Globe size={16} className="text-tinta-500" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1 rounded bg-tinta-700 px-3 py-1.5 text-sm text-white placeholder-tinta-500 focus:outline-none focus:ring-1 focus:ring-oro-500"
        />
        <Button size="sm" type="submit" disabled={loading}>
          Ir
        </Button>
      </form>
      <Button variant="danger" size="sm" onClick={onStop} loading={loading}>
        <Square size={14} />
        Detener
      </Button>
    </div>
  );
}
