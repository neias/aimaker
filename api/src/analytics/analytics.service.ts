import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentRun } from '../agent-runs/entities/agent-run.entity';
import { Issue } from '../issues/entities/issue.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AgentRun)
    private readonly runRepo: Repository<AgentRun>,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
  ) {}

  async getCostsByProject(projectId: string) {
    return this.issueRepo
      .createQueryBuilder('i')
      .select([
        'i.id as issue_id',
        'i.title as title',
        'i.status as status',
        'i."tokensUsed" as tokens_used',
        'i."costUsd" as cost_usd',
        'i."iterationCount" as iteration_count',
      ])
      .where('i."projectId" = :projectId', { projectId })
      .orderBy('i."costUsd"', 'DESC')
      .getRawMany();
  }

  async getSuccessRates(projectId: string) {
    return this.runRepo
      .createQueryBuilder('r')
      .innerJoin('r.task', 't')
      .innerJoin('t.issue', 'i')
      .select([
        'r."agentRole" as agent_role',
        'COUNT(*) as total_runs',
        'SUM(CASE WHEN r.status = \'completed\' THEN 1 ELSE 0 END) as successful',
        'SUM(CASE WHEN r.status = \'failed\' THEN 1 ELSE 0 END) as failed',
      ])
      .where('i."projectId" = :projectId', { projectId })
      .groupBy('r."agentRole"')
      .getRawMany();
  }

  async getTimeline(projectId: string) {
    return this.runRepo
      .createQueryBuilder('r')
      .innerJoin('r.task', 't')
      .innerJoin('t.issue', 'i')
      .select([
        'DATE(r."startedAt") as date',
        'SUM(r."tokensInput" + r."tokensOutput") as total_tokens',
        'SUM(r."costUsd") as total_cost',
        'COUNT(*) as run_count',
      ])
      .where('i."projectId" = :projectId', { projectId })
      .groupBy('DATE(r."startedAt")')
      .orderBy('date', 'ASC')
      .getRawMany();
  }
}
