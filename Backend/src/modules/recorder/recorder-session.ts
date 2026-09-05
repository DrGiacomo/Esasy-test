export interface CapturedStep {
  type: string;
  selector?: string;
  /** Estrategia del selector computado por el recorder: css | testId | role | text | xpath */
  selectorType?: string;
  /**
   * Como llama una persona al elemento: su aria-label, su texto, su placeholder...
   * Es lo que ve el modo SENCILLO. Va aparte del selector a proposito.
   */
  label?: string;
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
  /** Flush periódico de los pasos a BD para no perder la grabación si el backend cae. */
  flushTimer?: NodeJS.Timeout;
}
