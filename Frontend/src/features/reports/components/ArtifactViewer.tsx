import { Image, FileCode } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUiMode } from '@/hooks/useUiMode';

interface Props {
  screenshotUrl: string | null;
  videoUrl: string | null;
  traceUrl: string | null;
}

export function ArtifactViewer({ screenshotUrl, videoUrl, traceUrl }: Props) {
  const { sencillo } = useUiMode();
  // Los artefactos se sirven autenticados; <video>/<a> no mandan headers,
  // así que el token de acceso viaja en query string.
  const token = useAuthStore((s) => s.accessToken);
  const withToken = (url: string | null): string | null =>
    url && token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;

  const screenshot = withToken(screenshotUrl);
  const video = withToken(videoUrl);
  // La traza es un .zip que solo se abre con herramientas de Playwright: artefacto
  // de programador, fuera del modo sencillo. El video y la captura se quedan.
  const trace = sencillo ? null : withToken(traceUrl);

  if (!screenshot && !video && !trace) return null;

  return (
    <div className="mt-3 space-y-3">
      {video && (
        <video
          controls
          className="w-full rounded-lg border border-gray-200 bg-black"
          style={{ maxHeight: '400px' }}
        >
          <source src={video} type="video/webm" />
        </video>
      )}

      <div className="flex flex-wrap gap-2">
        {screenshot && (
          <a
            href={screenshot}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Image size={14} />
            Screenshot
          </a>
        )}
        {trace && (
          <a
            href={trace}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <FileCode size={14} />
            Trace
          </a>
        )}
      </div>
    </div>
  );
}
