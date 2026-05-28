import { Image, FileCode } from 'lucide-react';

interface Props {
  screenshotUrl: string | null;
  videoUrl: string | null;
  traceUrl: string | null;
}

export function ArtifactViewer({ screenshotUrl, videoUrl, traceUrl }: Props) {
  if (!screenshotUrl && !videoUrl && !traceUrl) return null;

  return (
    <div className="mt-3 space-y-3">
      {videoUrl && (
        <video
          controls
          className="w-full rounded-lg border border-gray-200 bg-black"
          style={{ maxHeight: '400px' }}
        >
          <source src={videoUrl} type="video/webm" />
        </video>
      )}

      <div className="flex flex-wrap gap-2">
        {screenshotUrl && (
          <a href={screenshotUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <Image size={14} />Screenshot
          </a>
        )}
        {traceUrl && (
          <a href={traceUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <FileCode size={14} />Trace
          </a>
        )}
      </div>
    </div>
  );
}
