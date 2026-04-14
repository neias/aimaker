import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';

@ApiTags('Policies')
@Controller()
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Post('projects/:projectId/policies')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreatePolicyDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Get('projects/:projectId/policies')
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.findByProject(projectId);
  }

  @Patch('policies/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreatePolicyDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('policies/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
