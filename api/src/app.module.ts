import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ProjectsModule } from './projects/projects.module';
import { IssuesModule } from './issues/issues.module';
import { TasksModule } from './tasks/tasks.module';
import { AgentRunsModule } from './agent-runs/agent-runs.module';
import { PoliciesModule } from './policies/policies.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { MilestonesModule } from './milestones/milestones.module';
import { ActivityModule } from './activity/activity.module';
import { WsModule } from './ws/ws.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { GitHubWebhookController } from './webhooks/github-webhook.controller';

@Module({
  controllers: [GitHubWebhookController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../../.env'),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get('POSTGRES_USER', 'aimaker'),
        password: config.get('POSTGRES_PASSWORD', 'aimaker_secret'),
        database: config.get('POSTGRES_DB', 'aimaker'),
        entities: [join(__dirname, '**/*.entity{.ts,.js}')],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    ProjectsModule,
    IssuesModule,
    TasksModule,
    AgentRunsModule,
    PoliciesModule,
    AnalyticsModule,
    OrchestratorModule,
    MilestonesModule,
    ActivityModule,
    WsModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
