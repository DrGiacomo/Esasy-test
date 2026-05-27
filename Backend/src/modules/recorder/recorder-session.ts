export interface CapturedStep {
  type: string;
  selector?: string;
  value?: string;
  url?: string;
  key?: string;
  x?: number;
  y?: number;
}

export interface RecorderSession {
  sessionId: string;
  projectId: string;
  orgId: string;
  containerId: string;
  targetUrl: string;
  startedAt: Date;
  status: 'ACTIVE' | 'STOPPED' | 'EXPIRED';
  steps: CapturedStep[];
}
