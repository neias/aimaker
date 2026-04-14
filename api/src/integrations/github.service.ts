import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: { name: string }[];
  state: string;
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(private readonly config: ConfigService) {}

  async fetchIssues(
    repo: string,
    token?: string,
    state: 'open' | 'closed' | 'all' = 'open',
    perPage = 100,
    page = 1,
  ): Promise<GitHubIssue[]> {
    const apiToken = token || this.config.get('GITHUB_TOKEN', '');
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'aimaker',
    };
    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    const url = `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=${perPage}&page=${page}`;

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (err: any) {
      throw new BadRequestException(
        `GitHub API connection failed: ${err.message}. Check your internet connection.`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`GitHub API error ${response.status}: ${text}`);

      if (response.status === 401) {
        throw new BadRequestException(
          'GitHub authentication failed. Please provide a valid access token in project settings.',
        );
      }
      if (response.status === 403) {
        throw new BadRequestException(
          'GitHub API rate limit exceeded or access denied. Add an access token in project settings.',
        );
      }
      if (response.status === 404) {
        throw new BadRequestException(
          `GitHub repository "${repo}" not found. Check the repo name or add an access token for private repos.`,
        );
      }
      throw new BadRequestException(
        `GitHub API error (${response.status}): ${text.substring(0, 200)}`,
      );
    }

    const issues: GitHubIssue[] = await response.json();
    return issues.filter((i) => !(i as any).pull_request);
  }

  async fetchAllIssues(
    repo: string,
    token?: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ): Promise<GitHubIssue[]> {
    const allIssues: GitHubIssue[] = [];
    let page = 1;

    while (true) {
      const batch = await this.fetchIssues(repo, token, state, 100, page);
      if (batch.length === 0) break;
      allIssues.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    this.logger.log(`Fetched ${allIssues.length} issues from ${repo}`);
    return allIssues;
  }
}
