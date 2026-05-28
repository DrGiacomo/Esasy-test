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
  const [connected, setConnected] = useState(executionsSocket.connected);

  useEffect(() => {
    if (!executionId) return;

    if (!executionsSocket.connected) executionsSocket.connect();
    executionsSocket.emit('execution:subscribe', { executionId });

    const onStatus = (data: ExecutionEvent) => {
      setEvents((prev) => [...prev, data]);
      if (data.status) setStatus(data.status);
    };

    const onConnect = () => {
      setConnected(true);
      executionsSocket.emit('execution:subscribe', { executionId });
    };

    const onDisconnect = () => setConnected(false);

    executionsSocket.on('execution:status', onStatus);
    executionsSocket.on('result:completed', onStatus);
    executionsSocket.on('result:started', onStatus);
    executionsSocket.on('connect', onConnect);
    executionsSocket.on('disconnect', onDisconnect);

    return () => {
      executionsSocket.emit('execution:unsubscribe', { executionId });
      executionsSocket.off('execution:status', onStatus);
      executionsSocket.off('result:completed', onStatus);
      executionsSocket.off('result:started', onStatus);
      executionsSocket.off('connect', onConnect);
      executionsSocket.off('disconnect', onDisconnect);
    };
  }, [executionId]);

  return { events, status, connected };
}
