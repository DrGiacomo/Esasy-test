import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto, userId: string): Promise<OrganizationResponseDto> {
    const slug = await this.uniqueSlug(dto.name);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.name, slug },
      });
      await tx.membership.create({
        data: { userId, organizationId: org.id, role: MemberRole.ADMIN },
      });
      return org;
    });

    return this.toResponse(result);
  }

  async findById(orgId: string, user: JwtPayload): Promise<OrganizationResponseDto> {
    this.assertSameOrg(orgId, user.orgId);

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.toResponse(org);
  }

  async update(
    orgId: string,
    dto: UpdateOrganizationDto,
    user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    this.assertSameOrg(orgId, user.orgId);

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const data: { name?: string; slug?: string } = {};

    if (dto.name && dto.name !== org.name) {
      data.name = dto.name;
      data.slug = await this.uniqueSlug(dto.name, orgId);
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data,
    });

    return this.toResponse(updated);
  }

  private assertSameOrg(paramOrgId: string, jwtOrgId: string): void {
    if (paramOrgId !== jwtOrgId) {
      throw new ForbiddenException('Cannot access a different organization');
    }
  }

  private toResponse(org: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationResponseDto {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  private async uniqueSlug(name: string, excludeOrgId?: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 48);

    let slug = base;
    let attempt = 0;

    while (true) {
      const existing = await this.prisma.organization.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeOrgId) break;
      attempt++;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }
}
