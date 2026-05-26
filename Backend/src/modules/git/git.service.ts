import { Injectable, NotFoundException } from '@nestjs/common';
import { VaultService } from '../../infrastructure/vault/vault.service';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGitIntegrationDto, GitIntegrationResponseDto } from './dto/git-integration.dto';

@Injectable()
export class GitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
  ) {}

  async create(dto: CreateGitIntegrationDto, user: JwtPayload): Promise<GitIntegrationResponseDto> {
    const encryptedToken = this.vault.encrypt(dto.token);
    const integration = await this.prisma.gitIntegration.create({
      data: {
        organizationId: user.orgId,
        provider: dto.provider,
        repoUrl: dto.repoUrl,
        defaultBranch: dto.defaultBranch ?? 'main',
        syncPath: dto.syncPath ?? 'e2e/',
        encryptedToken,
      },
    });
    return this.toResponse(integration);
  }

  async findAll(user: JwtPayload): Promise<GitIntegrationResponseDto[]> {
    const integrations = await this.prisma.gitIntegration.findMany({
      where: { organizationId: user.orgId },
    });
    return integrations.map(this.toResponse);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const integration = await this.prisma.gitIntegration.findFirst({
      where: { id, organizationId: user.orgId },
    });
    if (!integration) throw new NotFoundException('Git integration not found');
    await this.prisma.gitIntegration.delete({ where: { id } });
  }

  async sync(testId: string, user: JwtPayload): Promise<{ message: string }> {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, suite: { project: { organizationId: user.orgId } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (!test.generatedCode) throw new NotFoundException('No generated code to sync');

    const integration = await this.prisma.gitIntegration.findFirst({
      where: { organizationId: user.orgId, isActive: true },
    });
    if (!integration) throw new NotFoundException('No active Git integration');

    // TODO: implementar push al repositorio usando el token descifrado
    // const token = this.vault.decrypt(integration.encryptedToken);
    // await gitProvider.push(token, integration.repoUrl, integration.syncPath, test);

    await this.prisma.gitIntegration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });

    return { message: `Sync queued for test ${testId}` };
  }

  private toResponse(g: {
    id: string; organizationId: string; provider: import('@prisma/client').GitProvider;
    repoUrl: string; defaultBranch: string; syncPath: string;
    isActive: boolean; lastSyncedAt: Date | null; createdAt: Date;
  }): GitIntegrationResponseDto {
    return {
      id: g.id,
      organizationId: g.organizationId,
      provider: g.provider,
      repoUrl: g.repoUrl,
      defaultBranch: g.defaultBranch,
      syncPath: g.syncPath,
      isActive: g.isActive,
      lastSyncedAt: g.lastSyncedAt,
      createdAt: g.createdAt,
    };
  }
}
