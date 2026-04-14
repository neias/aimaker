import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@Controller()
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('issues/:issueId/tasks')
  findByIssue(@Param('issueId', ParseUUIDPipe) issueId: string) {
    return this.service.findByIssue(issueId);
  }

  @Get('tasks/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
