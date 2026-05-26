import { MemberRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;      // userId
  orgId: string;    // organizationId activa
  role: MemberRole;
  iat?: number;
  exp?: number;
}
