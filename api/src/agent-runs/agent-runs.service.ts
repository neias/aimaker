import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentRun } from './entities/agent-run.entity';
import { AgentLog } from './entities/agent-log.entity';

@Injectable()
export class AgentRunsService {
  constructor(
    @InjectRepository(AgentRun)
    private readonly runRepo: Repository<AgentRun>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  async findOne(id: string): Promise<AgentRun> {
    const run = await this.runRepo.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`AgentRun ${id} not found`);
    return run;
  }

  async getLogs(
    runId: string,
    offset = 0,
    limit = 200,
  ): Promise<AgentLog[]> {
    return this.logRepo.find({
      where: { runId },
      order: { timestamp: 'ASC' },
      skip: offset,
      take: limit,
    });
  }

  async appendLog(
    runId: string,
    stream: 'stdout' | 'stderr',
    line: string,
  ): Promise<AgentLog> {
    const log = this.logRepo.create({ runId, stream, line });
    return this.logRepo.save(log);
  }
}
