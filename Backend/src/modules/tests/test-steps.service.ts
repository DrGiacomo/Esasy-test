import { Injectable, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStepDto } from './dto/create-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { StepResponseDto } from './dto/test-response.dto';
import { TestVersionsService } from './test-versions.service';

@Injectable()
export class TestStepsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versions: TestVersionsService,
  ) {}

  async create(
    testId: string,
    dto: CreateStepDto,
    user: JwtPayload,
  ): Promise<StepResponseDto> {
    await this.assertTestOwnership(testId, user.orgId);

    return this.prisma.$transaction(async (tx) => {
      await this.versions.snapshot(testId, tx, { changelog: `Step added: ${dto.action}` });
      return tx.testStep.create({ data: { testId, ...dto } });
    });
  }

  async update(
    testId: string,
    stepId: string,
    dto: Partial<CreateStepDto>,
    user: JwtPayload,
  ): Promise<StepResponseDto> {
    await this.assertTestOwnership(testId, user.orgId);
    await this.findStepOrThrow(stepId, testId);

    return this.prisma.$transaction(async (tx) => {
      await this.versions.snapshot(testId, tx, { changelog: `Step updated: ${stepId}` });
      return tx.testStep.update({ where: { id: stepId }, data: dto });
    });
  }

  async remove(testId: string, stepId: string, user: JwtPayload): Promise<void> {
    await this.assertTestOwnership(testId, user.orgId);
    await this.findStepOrThrow(stepId, testId);

    await this.prisma.$transaction(async (tx) => {
      await this.versions.snapshot(testId, tx, { changelog: `Step removed: ${stepId}` });
      await tx.testStep.delete({ where: { id: stepId } });
    });
  }

  async reorder(testId: string, dto: ReorderStepsDto, user: JwtPayload): Promise<StepResponseDto[]> {
    await this.assertTestOwnership(testId, user.orgId);

    return this.prisma.$transaction(async (tx) => {
      await this.versions.snapshot(testId, tx, { changelog: 'Steps reordered' });
      for (const { stepId, order } of dto.steps) {
        await tx.testStep.update({ where: { id: stepId }, data: { order } });
      }
      return tx.testStep.findMany({
        where: { testId },
        orderBy: { order: 'asc' },
      });
    });
  }

  private async findStepOrThrow(stepId: string, testId: string) {
    const step = await this.prisma.testStep.findFirst({ where: { id: stepId, testId } });
    if (!step) throw new NotFoundException('Step not found');
    return step;
  }

  private async assertTestOwnership(testId: string, orgId: string): Promise<void> {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, suite: { project: { organizationId: orgId } } },
    });
    if (!test) throw new NotFoundException('Test not found');
  }
}
