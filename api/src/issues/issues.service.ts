import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue, IssueStatus } from './entities/issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { GitHubService } from '../integrations/github.service';

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    @InjectRepository(Issue)
    private readonly repo: Repository<Issue>,
    private readonly github: GitHubService,
  ) {}

  async create(projectId: string, dto: CreateIssueDto): Promise<Issue> {
    const issue = this.repo.create({ ...dto, projectId });
    return this.repo.save(issue);
  }

  async findByProject(
    projectId: string,
    status?: IssueStatus,
  ): Promise<Issue[]> {
    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['tasks'],
    });
  }

  async findOne(id: string): Promise<Issue> {
    const issue = await this.repo.findOne({
      where: { id },
      relations: ['tasks', 'tasks.agentRuns', 'checkpoints'],
    });
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  async updateStatus(id: string, status: IssueStatus): Promise<Issue> {
    const issue = await this.findOne(id);
    issue.status = status;
    return this.repo.save(issue);
  }

  async remove(id: string): Promise<void> {
    const issue = await this.findOne(id);
    await this.repo.remove(issue);
  }

  async incrementIteration(id: string): Promise<Issue> {
    const issue = await this.findOne(id);
    issue.iterationCount += 1;
    return this.repo.save(issue);
  }

  async saveAnalysis(
    id: string,
    analysis: string,
    sharedContract: Record<string, unknown> | null,
    specDocument: string | null,
  ): Promise<Issue> {
    const issue = await this.findOne(id);
    issue.analysis = analysis;
    if (sharedContract) issue.sharedContract = sharedContract;
    if (specDocument) issue.specDocument = specDocument;
    return this.repo.save(issue);
  }

  async addCost(id: string, tokens: number, costUsd: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Issue)
      .set({
        tokensUsed: () => `"tokensUsed" + ${tokens}`,
        costUsd: () => `"costUsd" + ${costUsd}`,
      })
      .where('id = :id', { id })
      .execute();
  }

  async syncFromGitHub(
    projectId: string,
    githubRepo: string,
    githubToken?: string,
  ): Promise<{ created: number; updated: number }> {
    // Normalize repo: strip URL prefix if user pasted full URL
    let repo = githubRepo.trim();
    repo = repo.replace(/^https?:\/\/github\.com\//, '');
    repo = repo.replace(/\.git$/, '');
    repo = repo.replace(/\/$/, '');

    if (!repo.includes('/') || repo.split('/').length !== 2) {
      throw new BadRequestException(
        `Invalid GitHub repo format: "${githubRepo}". Use owner/repo format (e.g., neias/mac-fe).`,
      );
    }

    const ghIssues = await this.github.fetchAllIssues(
      repo,
      githubToken,
      'open',
    );

    let created = 0;
    let updated = 0;

    for (const gh of ghIssues) {
      const existing = await this.repo.findOne({
        where: { projectId, githubIssueNumber: gh.number },
      });

      const labels = gh.labels.map((l) => l.name);

      if (existing) {
        existing.title = gh.title;
        existing.body = gh.body || '';
        existing.labels = labels;
        await this.repo.save(existing);
        updated++;
      } else {
        const issue = this.repo.create({
          projectId,
          githubIssueNumber: gh.number,
          title: gh.title,
          body: gh.body || '',
          labels,
          status: 'waiting',
        });
        await this.repo.save(issue);
        created++;
      }
    }

    this.logger.log(
      `GitHub sync for ${githubRepo}: ${created} created, ${updated} updated`,
    );
    return { created, updated };
  }
}
