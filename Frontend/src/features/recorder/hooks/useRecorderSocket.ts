import { useEffect, useState, useRef } from 'react';
import { recorderSocket } from '@/lib/socket/socket.client';
import type { CapturedStep } from '../recorder.types';

export function useRecorderSocket(sessionId: string | null) {
  const [frame, setFrame] = useState<string | null>(null);
  const [capturedSteps, setCapturedSteps] = useState<CapturedStep[]>([]);
  const [connected, setConnected] = useState(false);
  const frameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    recorderSocket.connect();
    recorderSocket.emit('session:join', { sessionId });

    recorderSocket.on('connect', () => setConnected(true));
    recorderSocket.on('disconnect', () => setConnected(false));

    recorderSocket.on('frame', (data: { data: string }) => {
      frameRef.current = `data:image/jpeg;base64,${data.data}`;
      setFrame(frameRef.current);
    });

    recorderSocket.on('action:captured', (data: { step: CapturedStep }) => {
      setCapturedSteps((prev) => [...prev, data.step]);
    });

    return () => {
      recorderSocket.off('connect');
      recorderSocket.off('disconnect');
      recorderSocket.off('frame');
      recorderSocket.off('action:captured');
      recorderSocket.disconnect();
    };
  }, [sessionId]);

  function performAction(action: object) {
    if (!sessionId) return;
    recorderSocket.emit('action:perform', { sessionId, ...action });
  }

  return { frame, capturedSteps, connected, performAction };
}
