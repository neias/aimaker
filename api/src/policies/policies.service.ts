import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(Policy)
    private readonly repo: Repository<Policy>,
  ) {}

  async create(projectId: string, dto: CreatePolicyDto): Promise<Policy> {
    const policy = this.repo.create({ ...dto, projectId });
    return this.repo.save(policy);
  }

  async findByProject(projectId: string): Promise<Policy[]> {
    return this.repo.find({
      where: { projectId },
      order: { scope: 'ASC', name: 'ASC' },
    });
  }

  async findEnabledByProject(
    projectId: string,
    scope?: string,
  ): Promise<Policy[]> {
    const where: Record<string, unknown> = { projectId, enabled: true };
    if (scope) where.scope = scope;
    return this.repo.find({ where });
  }

  async update(id: string, dto: Partial<CreatePolicyDto>): Promise<Policy> {
    const policy = await this.repo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException(`Policy ${id} not found`);
    Object.assign(policy, dto);
    return this.repo.save(policy);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Policy ${id} not found`);
    }
  }
}
