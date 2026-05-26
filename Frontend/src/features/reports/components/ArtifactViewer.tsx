import { Image, Video, FileCode } from 'lucide-react';

interface Props {
  screenshotUrl: string | null;
  videoUrl: string | null;
  traceUrl: string | null;
}

export function ArtifactViewer({ screenshotUrl, videoUrl, traceUrl }: Props) {
  if (!screenshotUrl && !videoUrl && !traceUrl) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {screenshotUrl && (
        <a href={screenshotUrl} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
          <Image size={14} />Screenshot
        </a>
      )}
      {videoUrl && (
        <a href={videoUrl} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
          <Video size={14} />Video
        </a>
      )}
      {traceUrl && (
        <a href={traceUrl} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
          <FileCode size={14} />Trace
        </a>
      )}
    </div>
  );
}
