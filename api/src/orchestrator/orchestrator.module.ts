import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { RedisSubscriberService } from './redis-subscriber.service';
import { IssuesModule } from '../issues/issues.module';
import { ProjectsModule } from '../projects/projects.module';
import { PoliciesModule } from '../policies/policies.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [HttpModule, ConfigModule, IssuesModule, ProjectsModule, PoliciesModule, WsModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, RedisSubscriberService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
