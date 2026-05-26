import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { MembershipsService } from './memberships.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { MemberResponseDto, OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(RoleGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(dto, user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.findById(id, user);
  }

  @Patch(':id')
  @Roles(MemberRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, dto, user);
  }

  // ── Membresías ────────────────────────────────────────────────────

  @Get(':id/members')
  listMembers(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MemberResponseDto[]> {
    return this.membershipsService.listMembers(id, user);
  }

  @Post(':id/members')
  @Roles(MemberRole.ADMIN)
  invite(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MemberResponseDto> {
    return this.membershipsService.invite(id, dto, user);
  }

  @Patch(':id/members/:userId')
  @Roles(MemberRole.ADMIN)
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MemberResponseDto> {
    return this.membershipsService.updateRole(id, userId, dto, user);
  }

  @Delete(':id/members/:userId')
  @Roles(MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.membershipsService.remove(id, userId, user);
  }
}
