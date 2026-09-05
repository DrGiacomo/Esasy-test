import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { GitProviderClient, GitPushOptions, GitPushResult } from './git-provider.interface';

/**
 * Push de un archivo a GitLab vía la Repository Files API. Crea (POST) o actualiza (PUT)
 * según exista el archivo. Soporta instancias self-hosted mediante GITLAB_API_URL.
 */
@Injectable()
export class GitlabProvider implements GitProviderClient {
  private readonly logger = new Logger(GitlabProvider.name);
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get<string>('GITLAB_API_URL', 'https://gitlab.com/api/v4');
  }

  async pushFile(opts: GitPushOptions): Promise<GitPushResult> {
    const projectId = encodeURIComponent(this.parseProjectPath(opts.repoUrl));
    const filePath = encodeURIComponent(opts.filePath);
    const url = `${this.apiUrl}/projects/${projectId}/repository/files/${filePath}`;
    const headers = { 'PRIVATE-TOKEN': opts.token };

    const body = {
      branch: opts.branch,
      content: opts.content,
      commit_message: opts.commitMessage,
    };

    const exists = await this.fileExists(url, opts.branch, headers);
    try {
      await axios.request({
        method: exists ? 'put' : 'post',
        url,
        data: body,
        headers,
        timeout: 20000,
      });
      return { committed: true };
    } catch (err) {
      this.handleError(err, 'push');
    }
  }

  private async fileExists(
    url: string,
    branch: string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    try {
      await axios.get(url, { headers, params: { ref: branch }, timeout: 20000 });
      return true;
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) return false;
      this.handleError(err, 'lookup');
    }
  }

  private parseProjectPath(repoUrl: string): string {
    // https://gitlab.com/group/subgroup/project(.git) → group/subgroup/project
    const match = /gitlab\.[^/]+\/(.+?)(?:\.git)?\/?$/.exec(repoUrl);
    if (!match) throw new BadRequestException(`Invalid GitLab repo URL: ${repoUrl}`);
    return match[1];
  }

  private handleError(err: unknown, phase: string): never {
    const status = err instanceof AxiosError ? err.response?.status : undefined;
    this.logger.error(`GitLab ${phase} failed (${status ?? '?'}): ${String(err)}`);
    if (status === 401 || status === 403) {
      throw new BadRequestException('GitLab rejected the token (auth/permissions)');
    }
    throw new ServiceUnavailableException('GitLab sync failed');
  }
}
