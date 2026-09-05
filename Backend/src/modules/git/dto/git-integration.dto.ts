import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { GitProvider } from '@prisma/client';

export class CreateGitIntegrationDto {
  @IsEnum(GitProvider)
  provider: GitProvider;

  @IsUrl()
  repoUrl: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @IsOptional()
  @IsString()
  syncPath?: string;

  @IsString()
  token: string; // Se cifra antes de guardar, nunca se devuelve
}

export class GitIntegrationResponseDto {
  id: string;
  organizationId: string;
  provider: GitProvider;
  repoUrl: string;
  defaultBranch: string;
  syncPath: string;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  // encryptedToken nunca se expone
}
