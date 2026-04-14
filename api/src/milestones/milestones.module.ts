import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Milestone } from './entities/milestone.entity';
import { Issue } from '../issues/entities/issue.entity';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { ProjectsModule } from '../projects/projects.module';
import { PoliciesModule } from '../policies/policies.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Milestone, Issue]),
    HttpModule,
    ConfigModule,
    ProjectsModule,
    PoliciesModule,
    WsModule,
  ],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
