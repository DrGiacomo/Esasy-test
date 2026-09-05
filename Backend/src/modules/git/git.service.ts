import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GitProvider } from '@prisma/client';
import { VaultService } from '../../infrastructure/vault/vault.service';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGitIntegrationDto, GitIntegrationResponseDto } from './dto/git-integration.dto';
import { GithubProvider } from './providers/github.provider';
import { GitlabProvider } from './providers/gitlab.provider';
import { GitProviderClient } from './providers/git-provider.interface';

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly github: GithubProvider,
    private readonly gitlab: GitlabProvider,
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
    return integrations.map((i) => this.toResponse(i));
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

    const token = this.vault.decrypt(integration.encryptedToken);
    const filePath = this.buildFilePath(integration.syncPath, test.name);
    const client = this.providerFor(integration.provider);

    const result = await client.pushFile({
      token,
      repoUrl: integration.repoUrl,
      branch: integration.defaultBranch,
      filePath,
      content: test.generatedCode,
      commitMessage: `chore(e2e): sync "${test.name}" [${testId}]`,
    });

    await this.prisma.gitIntegration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(
      `Synced test ${testId} → ${integration.provider} ${integration.repoUrl}:${filePath}`,
    );
    return { message: result.commitUrl ? `Synced: ${result.commitUrl}` : `Synced ${filePath}` };
  }

  private providerFor(provider: GitProvider): GitProviderClient {
    return provider === GitProvider.GITLAB ? this.gitlab : this.github;
  }

  /** Combina syncPath + nombre del test saneado en una ruta `*.spec.ts` segura. */
  private buildFilePath(syncPath: string, testName: string): string {
    const dir = syncPath.replace(/^\/+|\/+$/g, '');
    const slug =
      testName
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'test';
    return `${dir ? `${dir}/` : ''}${slug}.spec.ts`;
  }

  private toResponse(g: {
    id: string;
    organizationId: string;
    provider: import('@prisma/client').GitProvider;
    repoUrl: string;
    defaultBranch: string;
    syncPath: string;
    isActive: boolean;
    lastSyncedAt: Date | null;
    createdAt: Date;
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
