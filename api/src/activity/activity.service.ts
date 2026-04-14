import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityCategory } from './entities/activity-log.entity';
import { EventsGateway } from '../ws/events.gateway';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(data: {
    projectId: string;
    issueId?: string;
    milestoneId?: string;
    category: string;
    level?: string;
    event: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<ActivityLog> {
    const log = this.repo.create({
      projectId: data.projectId,
      issueId: data.issueId || null,
      milestoneId: data.milestoneId || null,
      category: data.category as ActivityCategory,
      level: (data.level || 'info') as any,
      event: data.event,
      message: data.message,
      metadata: data.metadata || {},
    });

    const saved = await this.repo.save(log);

    // Broadcast to WebSocket for real-time activity page
    this.eventsGateway.emitToProject(data.projectId, 'activity:new', {
      id: saved.id,
      category: saved.category,
      level: saved.level,
      event: saved.event,
      message: saved.message,
      metadata: saved.metadata,
      issueId: saved.issueId,
      milestoneId: saved.milestoneId,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  async findByProject(
    projectId: string,
    options?: {
      category?: string;
      level?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: ActivityLog[]; total: number }> {
    const where: Record<string, unknown> = { projectId };
    if (options?.category) where.category = options.category;
    if (options?.level) where.level = options.level;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return { data, total };
  }
}
