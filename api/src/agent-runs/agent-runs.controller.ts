import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgentRunsService } from './agent-runs.service';

@ApiTags('Agent Runs')
@Controller('runs')
export class AgentRunsController {
  constructor(private readonly service: AgentRunsService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/logs')
  getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getLogs(
      id,
      offset ? parseInt(offset, 10) : 0,
      limit ? parseInt(limit, 10) : 200,
    );
  }
}
