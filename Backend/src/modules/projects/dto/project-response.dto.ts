export class ProjectResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  baseUrl: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
