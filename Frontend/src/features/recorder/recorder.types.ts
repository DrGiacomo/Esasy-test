export interface RecorderSession {
  sessionId: string;
  projectId: string;
  targetUrl: string;
  status: 'ACTIVE' | 'STOPPED' | 'EXPIRED';
}

export interface CapturedStep {
  type: string;
  selector?: string;
  value?: string;
  url?: string;
  key?: string;
}
