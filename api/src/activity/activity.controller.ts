import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@Controller()
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Get('projects/:projectId/activity')
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findByProject(projectId, {
      category,
      level,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post('activity')
  create(
    @Body()
    body: {
      projectId: string;
      issueId?: string;
      milestoneId?: string;
      category: string;
      level?: string;
      event: string;
      message: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.service.create(body);
  }
}
