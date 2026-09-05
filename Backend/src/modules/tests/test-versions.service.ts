import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { TestVersionResponseDto } from './dto/test-response.dto';

@Injectable()
export class TestVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Llamado antes de cualquier modificación significativa al test.
  // Captura un snapshot inmutable de {flowModel, steps, generatedCode}.
  async snapshot(
    testId: string,
    tx?: Prisma.TransactionClient,
    options?: { label?: string; createdByAi?: boolean; changelog?: string },
  ): Promise<void> {
    const db = tx ?? this.prisma;

    // Lock de aviso a nivel de transacción por test: serializa snapshots concurrentes
    // del mismo test para que `count + 1` no colisione contra la unique testId_versionNumber
    // (P2002). Se libera al terminar la transacción. Requiere que snapshot corra dentro
    // de un $transaction (así lo hacen todos sus llamadores).
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${testId}))`;

    const test = await db.test.findUniqueOrThrow({
      where: { id: testId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    const nextVersion = (await db.testVersion.count({ where: { testId } })) + 1;

    await db.testVersion.create({
      data: {
        testId,
        versionNumber: nextVersion,
        label: options?.label,
        createdByAi: options?.createdByAi ?? false,
        changelog: options?.changelog,
        snapshotData: {
          flowModel: test.flowModel,
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

  async findAll(testId: string, user: JwtPayload): Promise<TestVersionResponseDto[]> {
    await this.assertTestOwnership(testId, user.orgId);
    return this.prisma.testVersion.findMany({
      where: { testId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findOne(
    testId: string,
    versionNumber: number,
    user: JwtPayload,
  ): Promise<TestVersionResponseDto> {
    await this.assertTestOwnership(testId, user.orgId);
    const version = await this.prisma.testVersion.findUnique({
      where: { testId_versionNumber: { testId, versionNumber } },
    });
    if (!version) throw new NotFoundException('Test version not found');
    return version;
  }

  // Los snapshots contienen flowModel, selectores y código generado: sin este
  // filtro cualquier usuario autenticado podía leer versiones de otra organización.
  private async assertTestOwnership(testId: string, orgId: string): Promise<void> {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, suite: { project: { organizationId: orgId } } },
      select: { id: true },
    });
    if (!test) throw new NotFoundException('Test not found');
  }
}
