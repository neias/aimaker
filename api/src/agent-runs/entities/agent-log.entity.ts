import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { AgentRun } from './agent-run.entity';

@Entity('agent_logs')
@Index(['runId', 'timestamp'])
export class AgentLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uuid')
  runId: string;

  @ManyToOne(() => AgentRun, (run) => run.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' })
  run: AgentRun;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ length: 10, default: 'stdout' })
  stream: 'stdout' | 'stderr';

  @Column({ type: 'text' })
  line: string;
}
