import { useEffect, useState } from 'react';
import { Image, FileCode } from 'lucide-react';
import { api } from '@/lib/api/axios.client';
import { useUiMode } from '@/hooks/useUiMode';

interface Props {
  screenshotUrl: string | null;
  videoUrl: string | null;
  traceUrl: string | null;
}

/** Las URLs de artefacto son `/artifacts/<executionId>/<archivo>`. */
function sacarExecutionId(...urls: (string | null)[]): string | null {
  for (const url of urls) {
    const trozos = url?.split('/') ?? [];
    const i = trozos.indexOf('artifacts');
    if (i >= 0 && trozos[i + 1]) return trozos[i + 1];
  }
  return null;
}

export function ArtifactViewer({ screenshotUrl, videoUrl, traceUrl }: Props) {
  const { sencillo } = useUiMode();

  // `<video>` e `<img>` no pueden mandar cabeceras, así que la credencial va en la
  // dirección. Antes iba el token de sesión ENTERO, y una dirección se guarda en el log del
  // servidor, en el historial del navegador y en cualquier intermediario: quien lo viera
  // tenía la cuenta. Ahora se pide un pase que solo abre los artefactos de esta ejecución y
  // caduca en diez minutos.
  const executionId = sacarExecutionId(screenshotUrl, videoUrl, traceUrl);
  const [pase, setPase] = useState<string | null>(null);

  useEffect(() => {
    if (!executionId) return;
    let vigente = true;
    api
      .get<{ token: string }>(`/executions/${executionId}/artifact-token`)
      .then((res) => {
        if (vigente) setPase(res.data.token);
      })
      .catch(() => {
        // Sin pase no se pintan los artefactos. Es preferible no enseñarlos a enseñarlos
        // rotos, y el motivo queda en la consola del navegador.
        if (vigente) setPase(null);
      });
    return () => {
      vigente = false;
    };
  }, [executionId]);

  const withToken = (url: string | null): string | null =>
    url && pase ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(pase)}` : null;

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
          className="w-full rounded-lg border border-tinta-300 bg-black"
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
            className="flex items-center gap-1 rounded-lg border border-tinta-300 px-3 py-1.5 text-xs text-tinta-600 hover:bg-tinta-50"
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
            className="flex items-center gap-1 rounded-lg border border-tinta-300 px-3 py-1.5 text-xs text-tinta-600 hover:bg-tinta-50"
          >
            <FileCode size={14} />
            Trace
          </a>
        )}
      </div>
    </div>
  );
}
