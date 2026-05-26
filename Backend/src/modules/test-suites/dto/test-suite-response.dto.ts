export class TestSuiteResponseDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
