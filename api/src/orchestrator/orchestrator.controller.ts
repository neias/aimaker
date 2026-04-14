import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';

@ApiTags('Orchestrator')
@Controller()
export class OrchestratorController {
  constructor(private readonly service: OrchestratorService) {}

  @Post('issues/:id/process')
  processIssue(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.processIssue(id);
  }

  @Post('issues/:id/cancel')
  cancelIssue(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelIssue(id);
  }

  @Get('orchestrator/health')
  health() {
    return this.service.getEngineHealth();
  }
}
