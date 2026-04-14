import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentRun } from './entities/agent-run.entity';
import { AgentLog } from './entities/agent-log.entity';
import { AgentRunsService } from './agent-runs.service';
import { AgentRunsController } from './agent-runs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentRun, AgentLog])],
  controllers: [AgentRunsController],
  providers: [AgentRunsService],
  exports: [AgentRunsService],
})
export class AgentRunsModule {}
