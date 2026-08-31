export const EXECUTION_QUEUE = 'execution';

export interface ExecutionJobData {
  executionId: string;
  projectId: string;
  orgId: string;
  suiteId?: string;
  testId?: string;
}
