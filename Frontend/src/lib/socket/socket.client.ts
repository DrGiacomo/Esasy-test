import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

function createSocket(namespace: string): Socket {
  return io(`${WS_URL}${namespace}`, {
    autoConnect: false,
    transports: ['websocket'],
    auth: (cb) => {
      cb({ token: useAuthStore.getState().accessToken });
    },
  });
}

export const executionsSocket = createSocket('/executions');
export const recorderSocket = createSocket('/recorder');
