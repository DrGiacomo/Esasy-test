import { MemberRole } from '@prisma/client';

export class OrganizationResponseDto {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberResponseDto {
  userId: string;
  email: string;
  displayName: string;
  role: MemberRole;
  joinedAt: Date;
}
