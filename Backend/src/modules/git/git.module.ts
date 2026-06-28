import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { GithubProvider } from './providers/github.provider';
import { GitlabProvider } from './providers/gitlab.provider';

@Module({
  controllers: [GitController],
  providers: [GitService, GithubProvider, GitlabProvider],
})
export class GitModule {}
