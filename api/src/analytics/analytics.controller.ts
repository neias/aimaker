import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('projects/:projectId/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('costs')
  getCosts(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.getCostsByProject(projectId);
  }

  @Get('success-rate')
  getSuccessRate(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.getSuccessRates(projectId);
  }

  @Get('timeline')
  getTimeline(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.getTimeline(projectId);
  }
}
