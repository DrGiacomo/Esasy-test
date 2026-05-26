import { TestStatus } from '@prisma/client';

export class StepResponseDto {
  id: string;
  testId: string;
  order: number;
  action: string;
  selector: string | null;
  selectorType: string | null;
  value: string | null;
  description: string | null;
  confidenceScore: number | null;
  isDisabled: boolean;
}

export class TestResponseDto {
  id: string;
  suiteId: string;
  name: string;
  description: string | null;
  status: TestStatus;
  semanticModel: unknown;
  generatedCode: string | null;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
  steps?: StepResponseDto[];
}

export class TestVersionResponseDto {
  id: string;
  testId: string;
  versionNumber: number;
  label: string | null;
  snapshotData: unknown;
  createdByAi: boolean;
  changelog: string | null;
  createdAt: Date;
}
