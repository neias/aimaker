import { Injectable, Logger, BadGatewayException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IssuesService } from '../issues/issues.service';
import { PoliciesService } from '../policies/policies.service';
import { ProjectsService } from '../projects/projects.service';
import { EventsGateway } from '../ws/events.gateway';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly engineUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly issuesService: IssuesService,
    private readonly projectsService: ProjectsService,
    private readonly policiesService: PoliciesService,
    private readonly eventsGateway: EventsGateway,
  ) {
    const port = this.config.get('ENGINE_PORT', '8100');
    this.engineUrl = `http://localhost:${port}`;
  }

  async processIssue(issueId: string): Promise<{ status: string }> {
    const issue = await this.issuesService.findOne(issueId);
    const project = await this.projectsService.findOne(issue.projectId);

    // Collect enabled policies for this project
    const policies = await this.policiesService.findEnabledByProject(project.id);
    const policyRules = policies.map((p) => `[${p.scope}] ${p.rule}`);

    await this.issuesService.updateStatus(issueId, 'analyzing');
    this.eventsGateway.emitToProject(issue.projectId, 'issue:status_changed', {
      issueId,
      oldStatus: issue.status,
      newStatus: 'analyzing',
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.engineUrl}/process`, {
          issue_id: issueId,
          project_id: issue.projectId,
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
          priority: issue.priority,
          max_iterations: issue.maxIterations,
          token_budget_usd: issue.tokenBudgetUsd,
          project_config: {
            backend_path: project.backendPath,
            frontend_path: project.frontendPath,
            base_branch: project.baseBranch,
            strategy: project.strategy,
            policies: policyRules,
            model_overrides: project.config?.model_overrides || {},
          },
        }),
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Engine process failed for issue ${issueId}`, error);
      await this.issuesService.updateStatus(issueId, 'failed');

      const isConnectionError =
        error?.code === 'ECONNREFUSED' ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.response?.status === undefined;

      if (isConnectionError) {
        throw new BadGatewayException(
          'Engine is not running. Start it with: cd engine && aimaker-engine serve',
        );
      }

      if (!project.backendPath && !project.frontendPath) {
        throw new BadRequestException(
          'No repository paths configured. Go to project settings and set backend/frontend paths.',
        );
      }

      throw new BadGatewayException(
        `Engine error: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`,
      );
    }
  }

  async cancelIssue(issueId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.engineUrl}/cancel/${issueId}`),
      );
    } catch (error) {
      this.logger.warn(`Engine cancel failed for issue ${issueId}`, error);
    }
    await this.issuesService.updateStatus(issueId, 'failed');
  }

  async getEngineHealth(): Promise<Record<string, unknown>> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.engineUrl}/health`),
      );
      return data;
    } catch {
      return { status: 'unreachable' };
    }
  }
}
