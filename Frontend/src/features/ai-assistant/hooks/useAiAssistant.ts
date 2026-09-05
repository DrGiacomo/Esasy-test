import { useState } from 'react';
import { api } from '@/lib/api/axios.client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(content: string) {
    const userMsg: ChatMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await api.post<{ content: string }>('/ai/chat', {
        messages: [...messages, userMsg],
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error al procesar la respuesta.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function nlToFlow(prompt: string, projectId: string) {
    setLoading(true);
    try {
      const res = await api.post<unknown[]>('/ai/nl-to-flow', { prompt, projectId });
      return res.data;
    } finally {
      setLoading(false);
    }
  }

  return { messages, loading, sendMessage, nlToFlow };
}
