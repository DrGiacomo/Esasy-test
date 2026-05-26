interface Props { frame: string | null; connected: boolean }

export function RemoteBrowserFrame({ frame, connected }: Props) {
  return (
    <div className="relative flex-1 bg-gray-800 flex items-center justify-center overflow-hidden">
      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <p className="text-sm text-gray-400">Iniciando sesión de grabación...</p>
        </div>
      )}
      {frame ? (
        <img
          src={frame}
          alt="Remote browser"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <p className="text-sm text-gray-500">Sin señal de video</p>
      )}
    </div>
  );
}
