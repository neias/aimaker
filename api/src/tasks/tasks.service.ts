import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  async findByIssue(issueId: string): Promise<Task[]> {
    return this.repo.find({
      where: { issueId },
      order: { executionOrder: 'ASC' },
      relations: ['agentRuns'],
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.repo.findOne({
      where: { id },
      relations: ['agentRuns', 'agentRuns.logs'],
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }
}
