import { Injectable, NotFoundException, BadGatewayException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly engineUrl: string;

  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const port = this.config.get('ENGINE_PORT', '8100');
    this.engineUrl = `http://localhost:${port}`;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.repo.create({
      ...dto,
      githubTokenEncrypted: dto.githubToken,
    });
    return this.repo.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.repo.findOne({ where: { id } });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    if (dto.githubToken) {
      project.githubTokenEncrypted = dto.githubToken;
    }
    return this.repo.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.repo.remove(project);
  }

  async scanCodebase(id: string): Promise<{ snapshot: string; length: number }> {
    const project = await this.findOne(id);

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.engineUrl}/scan-codebase`, {
          backend_path: project.backendPath || '',
          frontend_path: project.frontendPath || '',
        }),
      );

      project.codebaseSnapshotBackend = data.backend_snapshot || null;
      project.codebaseSnapshotFrontend = data.frontend_snapshot || null;
      project.codebaseScannedAt = new Date();
      await this.repo.save(project);

      this.logger.log(`Codebase scanned for project ${project.name}: BE=${data.backend_length}, FE=${data.frontend_length}`);
      return {
        backendLength: data.backend_length,
        frontendLength: data.frontend_length,
      };

    } catch (error: any) {
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
        throw new BadGatewayException('Engine is not running. Start it with: cd engine && aimaker-engine serve');
      }
      throw new BadGatewayException(`Scan failed: ${error?.message || 'Unknown error'}`);
    }
  }
}
