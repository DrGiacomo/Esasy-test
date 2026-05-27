import { Injectable, NotFoundException } from '@nestjs/common';
import { TestStatus } from '@prisma/client';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { TestResponseDto } from './dto/test-response.dto';
import { TestVersionsService } from './test-versions.service';

@Injectable()
export class TestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versions: TestVersionsService,
  ) {}

  async findSuite(suiteId: string, user: JwtPayload) {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id: suiteId, project: { organizationId: user.orgId } },
      select: { id: true, name: true, projectId: true },
    });
    if (!suite) throw new NotFoundException('Suite not found');
    return suite;
  }

  async create(suiteId: string, dto: CreateTestDto, user: JwtPayload): Promise<TestResponseDto> {
    await this.assertSuiteOwnership(suiteId, user.orgId);
    return this.prisma.test.create({
      data: {
        suiteId,
        name: dto.name,
        description: dto.description,
        semanticModel: [],
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(suiteId: string, user: JwtPayload): Promise<TestResponseDto[]> {
    await this.assertSuiteOwnership(suiteId, user.orgId);
    return this.prisma.test.findMany({
      where: { suiteId, status: { not: TestStatus.ARCHIVED } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, user: JwtPayload): Promise<TestResponseDto> {
    const test = await this.prisma.test.findFirst({
      where: { id, suite: { project: { organizationId: user.orgId } } },
      include: { steps: { orderBy: { order: 'asc' } }, suite: { select: { projectId: true } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async update(id: string, dto: Partial<CreateTestDto & { semanticModel: unknown; generatedCode: string; status: TestStatus }>, user: JwtPayload): Promise<TestResponseDto> {
    const test = await this.findById(id, user);

    const hasSignificantChange = dto.semanticModel !== undefined || dto.generatedCode !== undefined;

    return this.prisma.$transaction(async (tx) => {
      if (hasSignificantChange) {
        await this.versions.snapshot(test.id, tx, { changelog: 'Test updated' });
      }
      return tx.test.update({
        where: { id },
        data: dto as object,
        include: { steps: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async archive(id: string, user: JwtPayload): Promise<void> {
    await this.findById(id, user);
    await this.prisma.test.update({ where: { id }, data: { status: TestStatus.ARCHIVED } });
  }

  private async assertSuiteOwnership(suiteId: string, orgId: string): Promise<void> {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id: suiteId, project: { organizationId: orgId } },
    });
    if (!suite) throw new NotFoundException('Test suite not found');
  }
}
