import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { IssueStatus } from './entities/issue.entity';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('Issues')
@Controller('projects/:projectId/issues')
export class IssuesController {
  constructor(
    private readonly service: IssuesService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Post()
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Get()
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: IssueStatus,
  ) {
    return this.service.findByProject(projectId, status);
  }

  @Post('sync')
  async sync(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const project = await this.projectsService.findOne(projectId);
    if (!project.githubRepo) {
      throw new BadRequestException(
        'No GitHub repository configured. Go to project settings and add a GitHub repo (e.g., owner/repo).',
      );
    }
    return this.service.syncFromGitHub(
      projectId,
      project.githubRepo,
      project.githubTokenEncrypted,
    );
  }
}

@ApiTags('Issues')
@Controller('issues')
export class IssueDetailController {
  constructor(private readonly service: IssuesService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string; body?: string; priority?: string; enableQa?: boolean; labels?: string[] },
  ) {
    return this.service.update(id, body);
  }

  @Post(':id/analysis')
  saveAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { analysis: string; sharedContract?: Record<string, unknown>; specDocument?: string },
  ) {
    return this.service.saveAnalysis(id, body.analysis, body.sharedContract || null, body.specDocument || null);
  }

  @Post(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.updateStatus(id, 'waiting');
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
