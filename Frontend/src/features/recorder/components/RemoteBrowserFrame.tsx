import { useRef } from 'react';

const REMOTE_W = 1280;
const REMOTE_H = 720;

interface ActionPayload {
  type: string;
  x?: number;
  y?: number;
  key?: string;
  value?: string;
  selector?: string;
}

interface Props {
  frame: string | null;
  connected: boolean;
  onAction: (action: ActionPayload) => void;
}

export function RemoteBrowserFrame({ frame, connected, onAction }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);

  function toRemoteCoords(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width)  * REMOTE_W);
    const y = Math.round(((e.clientY - rect.top)  / rect.height) * REMOTE_H);
    return { x, y };
  }

  function handleClick(e: React.MouseEvent<HTMLImageElement>) {
    e.currentTarget.focus();
    const { x, y } = toRemoteCoords(e);
    onAction({ type: 'click', x, y });
  }

  function handleDblClick(e: React.MouseEvent<HTMLImageElement>) {
    const { x, y } = toRemoteCoords(e);
    onAction({ type: 'dblclick', x, y });
  }

  function handleContextMenu(e: React.MouseEvent<HTMLImageElement>) {
    e.preventDefault();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLImageElement>) {
    e.preventDefault();

    const specialKeys = [
      'Enter', 'Backspace', 'Tab', 'Escape', 'Delete',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown',
      'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
    ];

    if (specialKeys.includes(e.key)) {
      onAction({ type: 'press', key: e.key });
    } else if (e.key.length === 1) {
      onAction({ type: 'type', value: e.key });
    }
  }

  return (
    <div className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Overlay while not connected */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Iniciando sesión de grabación…</p>
        </div>
      )}

      {frame ? (
        <img
          ref={imgRef}
          src={frame}
          alt="Navegador remoto"
          tabIndex={0}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          className="max-h-full max-w-full object-contain cursor-crosshair select-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          draggable={false}
        />
      ) : (
        connected && (
          <p className="text-sm text-gray-500">Sin señal de video… esperando frames</p>
        )
      )}

      {/* Hint */}
      {connected && frame && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs text-gray-300 pointer-events-none">
          Click para interactuar · Escribe para escribir · Enter / Backspace / Flechas funcionan
        </div>
      )}
    </div>
  );
}
