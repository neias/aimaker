import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventsGateway } from '../ws/events.gateway';
import { IssuesService } from '../issues/issues.service';
import { ActivityService } from '../activity/activity.service';

interface EngineEvent {
  type: string;
  timestamp: number;
  data: {
    project_id: string;
    issue_id?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly eventsGateway: EventsGateway,
    private readonly issuesService: IssuesService,
    private readonly activityService: ActivityService,
  ) {
    const host = this.config.get('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    this.subscriber = new Redis({ host, port });
  }

  async onModuleInit() {
    this.subscriber.on('pmessage', (_pattern, channel, message) => {
      this.handleMessage(channel, message);
    });

    await this.subscriber.psubscribe('aimaker:events:*');
    await this.subscriber.psubscribe('aimaker:terminal:*');
    this.logger.log('Redis subscriber connected - listening for engine events');
  }

  async onModuleDestroy() {
    await this.subscriber.punsubscribe();
    this.subscriber.disconnect();
  }

  private async handleMessage(channel: string, message: string) {
    try {
      const event: EngineEvent = JSON.parse(message);
      const { type, data } = event;
      const projectId = data.project_id;
      const issueId = data.issue_id;

      if (channel.startsWith('aimaker:events:')) {
        // Forward to WebSocket
        this.eventsGateway.emitToProject(projectId, type, data);

        // Persist to activity log
        try {
          await this.activityService.create({
            projectId,
            issueId: issueId || undefined,
            category: 'ws',
            event: type,
            message: this.formatEventMessage(type, data),
            metadata: data as Record<string, unknown>,
          });
        } catch (e) {
          this.logger.warn(`Failed to persist activity: ${e}`);
        }

        // Update issue status
        if (type === 'issue:status_changed' && issueId) {
          const newStatus = data.new_status as string;
          try {
            await this.issuesService.updateStatus(issueId, newStatus as any);
          } catch (e) {
            this.logger.warn(`Failed to update issue status: ${e}`);
          }
        }
      }

      if (channel.startsWith('aimaker:terminal:')) {
        const runId = data.run_id as string;
        const stream = data.stream as string;
        const line = data.line as string;
        this.eventsGateway.emitTerminalOutput(runId, stream, line);
      }
    } catch (e) {
      this.logger.error(`Failed to parse engine event: ${e}`);
    }
  }

  private formatEventMessage(type: string, data: Record<string, unknown>): string {
    switch (type) {
      case 'issue:status_changed':
        return `Issue status: ${data.old_status} → ${data.new_status}`;
      case 'task:created':
        return `Task created: [${data.agent_role}] ${data.title}`;
      case 'task:started':
        return `Agent started: ${data.agent_role}`;
      case 'task:completed':
        return `Agent completed: ${data.agent_role} (${Number(data.duration_seconds || 0).toFixed(1)}s)`;
      case 'task:failed':
        return `Agent failed: ${data.agent_role} — ${data.error || 'unknown'}`;
      case 'qa:verdict':
        return `QA verdict: ${data.verdict}`;
      case 'pipeline:completed':
        return `Pipeline completed: ${data.stage}`;
      case 'pipeline:failed':
        return `Pipeline failed: ${data.error}`;
      default:
        return type;
    }
  }
}
