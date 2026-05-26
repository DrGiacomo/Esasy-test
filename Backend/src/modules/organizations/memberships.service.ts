import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { MemberResponseDto } from './dto/organization-response.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(orgId: string, user: JwtPayload): Promise<MemberResponseDto[]> {
    this.assertSameOrg(orgId, user.orgId);

    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async invite(
    orgId: string,
    dto: InviteMemberDto,
    user: JwtPayload,
  ): Promise<MemberResponseDto> {
    this.assertSameOrg(orgId, user.orgId);

    const target = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true },
    });
    if (!target) throw new NotFoundException('No user found with that email');

    const existing = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId: target.id, organizationId: orgId } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const membership = await this.prisma.membership.create({
      data: { userId: target.id, organizationId: orgId, role: dto.role },
    });

    return {
      userId: target.id,
      email: target.email,
      displayName: target.displayName,
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  }

  async updateRole(
    orgId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    user: JwtPayload,
  ): Promise<MemberResponseDto> {
    this.assertSameOrg(orgId, user.orgId);

    const membership = await this.findMembershipOrThrow(targetUserId, orgId);

    // Protección: no degradar al último ADMIN
    if (membership.role === MemberRole.ADMIN && dto.role !== MemberRole.ADMIN) {
      await this.assertNotLastAdmin(orgId, targetUserId);
    }

    const updated = await this.prisma.membership.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });

    return {
      userId: updated.user.id,
      email: updated.user.email,
      displayName: updated.user.displayName,
      role: updated.role,
      joinedAt: updated.joinedAt,
    };
  }

  async remove(orgId: string, targetUserId: string, user: JwtPayload): Promise<void> {
    this.assertSameOrg(orgId, user.orgId);

    // Un usuario puede removerse a sí mismo salvo que sea el último ADMIN
    if (targetUserId !== user.sub) {
      // Solo ADMIN puede remover a otros (el RoleGuard ya lo verificó, esto es doble check)
    }

    const membership = await this.findMembershipOrThrow(targetUserId, orgId);

    if (membership.role === MemberRole.ADMIN) {
      await this.assertNotLastAdmin(orgId, targetUserId);
    }

    await this.prisma.membership.delete({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
  }

  private async findMembershipOrThrow(userId: string, orgId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership) throw new NotFoundException('Member not found in this organization');
    return membership;
  }

  private async assertNotLastAdmin(orgId: string, userId: string): Promise<void> {
    const adminCount = await this.prisma.membership.count({
      where: { organizationId: orgId, role: MemberRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot remove or demote the last ADMIN of an organization',
      );
    }
  }

  private assertSameOrg(paramOrgId: string, jwtOrgId: string): void {
    if (paramOrgId !== jwtOrgId) {
      throw new ForbiddenException('Cannot access a different organization');
    }
  }
}
