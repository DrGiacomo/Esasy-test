import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TestVersionResponseDto } from './dto/test-response.dto';

@Injectable()
export class TestVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Llamado antes de cualquier modificación significativa al test.
  // Captura un snapshot inmutable de {semanticModel, steps, generatedCode}.
  async snapshot(
    testId: string,
    tx?: Prisma.TransactionClient,
    options?: { label?: string; createdByAi?: boolean; changelog?: string },
  ): Promise<void> {
    const db = tx ?? this.prisma;

    const test = await db.test.findUniqueOrThrow({
      where: { id: testId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    const nextVersion = await db.testVersion.count({ where: { testId } }) + 1;

    await db.testVersion.create({
      data: {
        testId,
        versionNumber: nextVersion,
        label: options?.label,
        createdByAi: options?.createdByAi ?? false,
        changelog: options?.changelog,
        snapshotData: {
          semanticModel: test.semanticModel,
          generatedCode: test.generatedCode,
          steps: test.steps,
        } as unknown as Prisma.JsonObject,
      },
    });

    await db.test.update({
      where: { id: testId },
      data: { currentVersion: nextVersion },
    });
  }

  async findAll(testId: string): Promise<TestVersionResponseDto[]> {
    return this.prisma.testVersion.findMany({
      where: { testId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findOne(testId: string, versionNumber: number): Promise<TestVersionResponseDto> {
    return this.prisma.testVersion.findUniqueOrThrow({
      where: { testId_versionNumber: { testId, versionNumber } },
    });
  }
}
