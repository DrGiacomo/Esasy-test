export interface CapturedStep {
  type: string;
  selector?: string;
  /** Estrategia del selector computado por el recorder: css | testId | role | text | xpath */
  selectorType?: string;
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
  /** Handle del auto-expire (30 min); se cancela al hacer stop() para no retener la sesión. */
  expireTimer?: NodeJS.Timeout;
}
