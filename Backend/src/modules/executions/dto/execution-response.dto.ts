import { ExecutionStatus } from '@prisma/client';

export class ExecutionResponseDto {
  id: string;
  projectId: string;
  triggeredBy: string;
  status: ExecutionStatus;
  dockerContainerId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  reportUrl: string | null;
  createdAt: Date;
}
