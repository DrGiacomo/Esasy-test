// Tipos mapeados 1:1 desde los modelos Prisma del backend

export type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type TestStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ExecutionStatus = 'QUEUED' | 'PROVISIONING' | 'RUNNING' | 'COLLECTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type StepResultStatus = 'PASSED' | 'FAILED' | 'SKIPPED';
export type HealingStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
export type AiOperationType = 'CODEGEN' | 'SELF_HEALING' | 'NL_TO_FLOW' | 'DOCUMENTATION' | 'CHAT';
export type GitProvider = 'GITHUB' | 'GITLAB';
export type SecretType = 'ENV_VAR' | 'GIT_TOKEN' | 'WEBHOOK_SECRET';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  user?: User;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  baseUrl: string;
  organizationId: string;
  isArchived: boolean;
  maxParallel: number | null;
  recordVideo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  isArchived: boolean;
  createdAt: string;
}

/**
 * Como ve la plataforma un usuario. Son DOS y solo dos, y el rol no influye.
 * SENCILLO es el defecto para todo el mundo; pasar a COMPLEJO lo decide cada uno.
 */
export type UiMode = 'SENCILLO' | 'COMPLEJO';

export interface TestStep {
  id: string;
  testId: string;
  action: string;
  selector: string | null;
  selectorType: string | null;
  value: string | null;
  description: string | null;
  order: number;
  isDisabled: boolean;
  confidenceScore: number | null;
}

export interface Test {
  id: string;
  name: string;
  /** Explicación en lenguaje llano generada por IA. Se ve en los dos modos. */
  documentation?: string | null;
  documentedAt?: string | null;
  description: string | null;
  suiteId: string;
  status: TestStatus;
  flowModel: unknown;
  generatedCode: string | null;
  currentVersion: number;
  isArchived: boolean;
  steps?: TestStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TestVersion {
  id: string;
  testId: string;
  versionNumber: number;
  snapshot: unknown;
  createdAt: string;
}

export interface StepResult {
  id: string;
  executionResultId: string;
  stepId: string;
  status: StepResultStatus;
  durationMs: number;
  actualValue: string | null;
  errorDetails: string | null;
  step?: TestStep;
}

export interface ExecutionResult {
  id: string;
  executionId: string;
  testId: string;
  status: ExecutionStatus;
  durationMs: number | null;
  errorMessage: string | null;
  screenshotUrl: string | null;
  videoUrl: string | null;
  traceUrl: string | null;
  test?: { id: string; name: string };
  stepResults?: StepResult[];
}

export interface Execution {
  id: string;
  projectId: string;
  suiteId: string | null;
  status: ExecutionStatus;
  triggeredBy: string;
  dockerContainerId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  results?: ExecutionResult[];
  createdAt: string;
}

export interface Secret {
  id: string;
  organizationId: string;
  name: string;
  type: SecretType;
  description: string | null;
  createdAt: string;
}

export interface GitIntegration {
  id: string;
  organizationId: string;
  provider: GitProvider;
  repoUrl: string;
  branch: string;
  createdAt: string;
}

export interface SelectorHealingLog {
  id: string;
  testStepId: string;
  originalSelector: string;
  proposedSelector: string;
  proposedSelectorType: string;
  confidence: number;
  reasoning: string;
  status: HealingStatus;
  rejectionReason: string | null;
  createdAt: string;
}
