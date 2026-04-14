import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';

@ApiTags('Milestones')
@Controller()
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Post('projects/:projectId/milestones')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Get('projects/:projectId/milestones')
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.findByProject(projectId);
  }

  @Get('milestones/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post('milestones/:id/analyze')
  analyze(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.analyze(id);
  }

  @Delete('milestones/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
