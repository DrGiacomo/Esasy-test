import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { GitProviderClient, GitPushOptions, GitPushResult } from './git-provider.interface';

/**
 * Push de un archivo a GitHub vía la Contents API (no requiere binario git).
 * Crea el archivo o lo actualiza (resolviendo el sha previo). Soporta GitHub Enterprise
 * mediante GITHUB_API_URL.
 */
@Injectable()
export class GithubProvider implements GitProviderClient {
  private readonly logger = new Logger(GithubProvider.name);
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get<string>('GITHUB_API_URL', 'https://api.github.com');
  }

  async pushFile(opts: GitPushOptions): Promise<GitPushResult> {
    const { owner, repo } = this.parseRepo(opts.repoUrl);
    const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/${encodeURI(opts.filePath)}`;
    const headers = {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const sha = await this.getExistingSha(url, opts.branch, headers);

    try {
      const res = await axios.put(
        url,
        {
          message: opts.commitMessage,
          content: Buffer.from(opts.content, 'utf8').toString('base64'),
          branch: opts.branch,
          ...(sha ? { sha } : {}),
        },
        { headers, timeout: 20000 },
      );
      return { committed: true, commitUrl: res.data?.commit?.html_url };
    } catch (err) {
      this.handleError(err, 'push');
    }
  }

  private async getExistingSha(
    url: string,
    branch: string,
    headers: Record<string, string>,
  ): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers, params: { ref: branch }, timeout: 20000 });
      return res.data?.sha;
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) return undefined;
      this.handleError(err, 'lookup');
    }
  }

  private parseRepo(repoUrl: string): { owner: string; repo: string } {
    const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(repoUrl);
    if (!match) throw new BadRequestException(`Invalid GitHub repo URL: ${repoUrl}`);
    return { owner: match[1], repo: match[2] };
  }

  private handleError(err: unknown, phase: string): never {
    const status = err instanceof AxiosError ? err.response?.status : undefined;
    this.logger.error(`GitHub ${phase} failed (${status ?? '?'}): ${String(err)}`);
    if (status === 401 || status === 403) {
      throw new BadRequestException('GitHub rejected the token (auth/permissions)');
    }
    throw new ServiceUnavailableException('GitHub sync failed');
  }
}
