import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { AgentLog } from './agent-log.entity';

export type RunStatus = 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
export type ModelTier = 'L1' | 'L2' | 'L3';

@Entity('agent_runs')
export class AgentRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (task) => task.agentRuns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ length: 20 })
  agentRole: string;

  @Column({ length: 10 })
  modelTier: ModelTier;

  @Column({ length: 50, nullable: true })
  modelName: string;

  @Column({ length: 100, nullable: true })
  containerId: string;

  @Column({ length: 20, default: 'running' })
  status: RunStatus;

  @Column({ type: 'text', nullable: true })
  inputPrompt: string;

  @Column({ type: 'text', nullable: true })
  output: string;

  @Column({ type: 'jsonb', nullable: true })
  parsedResult: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  tokensInput: number;

  @Column({ type: 'int', default: 0 })
  tokensOutput: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costUsd: number;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  durationSeconds: number;

  @OneToMany(() => AgentLog, (log) => log.run)
  logs: AgentLog[];
}
