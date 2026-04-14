import { Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Milestone } from './entities/milestone.entity';
import { Issue } from '../issues/entities/issue.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { PoliciesService } from '../policies/policies.service';
import { ProjectsService } from '../projects/projects.service';
import { EventsGateway } from '../ws/events.gateway';

@Injectable()
export class MilestonesService {
  private readonly logger = new Logger(MilestonesService.name);
  private readonly engineUrl: string;

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepo: Repository<Milestone>,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly policiesService: PoliciesService,
    private readonly eventsGateway: EventsGateway,
  ) {
    const port = this.config.get('ENGINE_PORT', '8100');
    this.engineUrl = `http://localhost:${port}`;
  }

  async create(projectId: string, dto: CreateMilestoneDto): Promise<Milestone> {
    const milestone = this.milestoneRepo.create({ ...dto, projectId });
    return this.milestoneRepo.save(milestone);
  }

  async findByProject(projectId: string): Promise<Milestone[]> {
    return this.milestoneRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      relations: ['issues'],
    });
  }

  async findOne(id: string): Promise<Milestone> {
    const milestone = await this.milestoneRepo.findOne({
      where: { id },
      relations: ['issues', 'issues.tasks'],
    });
    if (!milestone) throw new NotFoundException(`Milestone ${id} not found`);
    return milestone;
  }

  async analyze(id: string): Promise<Milestone> {
    const milestone = await this.findOne(id);
    const project = await this.projectsService.findOne(milestone.projectId);

    const policies = await this.policiesService.findEnabledByProject(project.id);
    const policyRules = policies.map((p) => `[${p.scope}] ${p.rule}`);

    milestone.status = 'analyzing';
    await this.milestoneRepo.save(milestone);

    this.eventsGateway.emitToProject(milestone.projectId, 'milestone:analyzing', {
      milestoneId: id,
      title: milestone.title,
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.engineUrl}/analyze-milestone`, {
          milestone_id: id,
          project_id: milestone.projectId,
          title: milestone.title,
          description: milestone.description || '',
          strategy: milestone.strategy,
          policies: policyRules,
          project_type: project.projectType || 'fullstack',
          project_description: project.description || '',
        }),
      );

      // Save analysis results
      milestone.analysis = data.analysis || '';
      milestone.sharedContract = data.shared_contract || null;
      milestone.specDocument = data.spec_document || null;
      milestone.status = 'ready';

      // Create issues from generated tasks
      const allTasks = [
        ...(data.backend_tasks || []),
        ...(data.frontend_tasks || []),
      ];

      for (const task of allTasks) {
        const issue = this.issueRepo.create({
          projectId: milestone.projectId,
          milestoneId: id,
          title: task.title || task.id,
          body: task.description || '',
          labels: [task.agent_role, milestone.strategy],
          priority: 'P1',
          status: 'waiting',
        });
        await this.issueRepo.save(issue);
      }

      milestone.totalTasks = allTasks.length;
      await this.milestoneRepo.save(milestone);

      this.eventsGateway.emitToProject(milestone.projectId, 'milestone:ready', {
        milestoneId: id,
        tasksCreated: allTasks.length,
      });

      return milestone;

    } catch (error: any) {
      milestone.status = 'failed';
      await this.milestoneRepo.save(milestone);

      const isConnectionError =
        error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED');

      if (isConnectionError) {
        throw new BadGatewayException(
          'Engine is not running. Start it with: cd engine && aimaker-engine serve',
        );
      }

      throw new BadGatewayException(
        `Milestone analysis failed: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.milestoneRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Milestone ${id} not found`);
  }
}
