import { Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { TestSuiteResponseDto } from './dto/test-suite-response.dto';

@Injectable()
export class TestSuitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    projectId: string,
    dto: CreateTestSuiteDto,
    user: JwtPayload,
  ): Promise<TestSuiteResponseDto> {
    await this.assertProjectOwnership(projectId, user.orgId);
    return this.prisma.testSuite.create({
      data: { projectId, name: dto.name, description: dto.description },
    });
  }

  async findAll(projectId: string, user: JwtPayload): Promise<TestSuiteResponseDto[]> {
    await this.assertProjectOwnership(projectId, user.orgId);
    return this.prisma.testSuite.findMany({
      where: { projectId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, user: JwtPayload): Promise<TestSuiteResponseDto> {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id, project: { organizationId: user.orgId } },
    });
    if (!suite) throw new NotFoundException('Test suite not found');
    return suite;
  }

  async update(
    id: string,
    dto: Partial<CreateTestSuiteDto>,
    user: JwtPayload,
  ): Promise<TestSuiteResponseDto> {
    await this.findById(id, user);
    return this.prisma.testSuite.update({ where: { id }, data: dto });
  }

  async archive(id: string, user: JwtPayload): Promise<void> {
    await this.findById(id, user);
    await this.prisma.testSuite.update({ where: { id }, data: { isArchived: true } });
  }

  private async assertProjectOwnership(projectId: string, orgId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');
  }
}
