import { Bot, User } from 'lucide-react';
import type { ChatMessage } from '../hooks/useAiAssistant';

export function AiChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-sangre-100' : 'bg-tinta-200'}`}
      >
        {isUser ? (
          <User size={14} className="text-sangre-600" />
        ) : (
          <Bot size={14} className="text-tinta-600" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isUser ? 'bg-sangre-600 text-white' : 'bg-tinta-200 text-tinta-800'}`}
      >
        {message.content}
      </div>
    </div>
  );
}
