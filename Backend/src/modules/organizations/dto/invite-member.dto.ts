import { IsEmail, IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
