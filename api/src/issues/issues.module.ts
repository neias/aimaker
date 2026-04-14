import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';
import { GitCheckpoint } from './entities/git-checkpoint.entity';
import { IssuesController, IssueDetailController } from './issues.controller';
import { IssuesService } from './issues.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Issue, GitCheckpoint]), ProjectsModule],
  controllers: [IssuesController, IssueDetailController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
