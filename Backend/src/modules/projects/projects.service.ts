import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto, user: JwtPayload): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        organizationId: user.orgId,
        name: dto.name,
        description: dto.description,
        baseUrl: dto.baseUrl,
      },
    });
    return project;
  }

  async findAll(user: JwtPayload, includeArchived = false): Promise<ProjectResponseDto[]> {
    return this.prisma.project.findMany({
      where: {
        organizationId: user.orgId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, user: JwtPayload): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: user.orgId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    await this.findById(id, user);

    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async archive(id: string, user: JwtPayload): Promise<void> {
    this.assertEditorOrAbove(user);
    await this.findById(id, user);

    await this.prisma.project.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  private assertEditorOrAbove(user: JwtPayload): void {
    if (user.role === MemberRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot modify projects');
    }
  }
}
