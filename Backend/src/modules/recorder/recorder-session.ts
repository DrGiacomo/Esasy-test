export interface RecorderSession {
  sessionId: string;
  projectId: string;
  orgId: string;
  containerId: string;
  targetUrl: string;
  startedAt: Date;
  status: 'ACTIVE' | 'STOPPED' | 'EXPIRED';
}
