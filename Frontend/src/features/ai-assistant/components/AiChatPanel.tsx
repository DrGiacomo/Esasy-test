import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAiAssistant } from '../hooks/useAiAssistant';
import { AiChatMessage } from './AiChatMessage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function AiChatPanel() {
  const { messages, loading, sendMessage } = useAiAssistant();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    void sendMessage(input.trim());
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-texto-tenue mt-8">
            Pregúntame sobre Playwright, E2E testing o cómo usar esta plataforma.
          </p>
        )}
        {messages.map((m, i) => (
          <AiChatMessage key={i} message={m} />
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-superficie-2">
              <LoadingSpinner size={14} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-linea p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-lg bg-sangre-600 p-2 text-white hover:bg-sangre-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
