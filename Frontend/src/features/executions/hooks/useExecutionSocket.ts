import { useEffect, useState } from 'react';
import { executionsSocket } from '@/lib/socket/socket.client';
import type { ExecutionStatus } from '@/types/models';

interface ExecutionEvent {
  event: string;
  executionId: string;
  status?: ExecutionStatus;
  testId?: string;
  message?: string;
  timestamp: number;
}

export function useExecutionSocket(executionId: string) {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [status, setStatus] = useState<ExecutionStatus | null>(null);

  useEffect(() => {
    if (!executionId) return;

    executionsSocket.connect();
    executionsSocket.emit('execution:subscribe', { executionId });

    const onStatus = (data: ExecutionEvent) => {
      setEvents((prev) => [...prev, data]);
      if (data.status) setStatus(data.status);
    };

    executionsSocket.on('execution:status', onStatus);
    executionsSocket.on('result:completed', onStatus);
    executionsSocket.on('result:started', onStatus);

    return () => {
      executionsSocket.emit('execution:unsubscribe', { executionId });
      executionsSocket.off('execution:status', onStatus);
      executionsSocket.off('result:completed', onStatus);
      executionsSocket.off('result:started', onStatus);
      executionsSocket.disconnect();
    };
  }, [executionId]);

  return { events, status };
}
