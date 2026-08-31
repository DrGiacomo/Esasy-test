export class ProjectResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  baseUrl: string;
  isArchived: boolean;
  maxParallel: number | null;
  recordVideo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
