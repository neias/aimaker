import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';
import { AgentRun } from '../../agent-runs/entities/agent-run.entity';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentRole = 'pm' | 'backend' | 'frontend' | 'qa';

@Entity('tasks')
@Index(['issueId', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  issueId: string;

  @ManyToOne(() => Issue, (issue) => issue.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issueId' })
  issue: Issue;

  @Column({ length: 20 })
  agentRole: AgentRole;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  filesToCreate: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  filesToModify: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  acceptanceCriteria: string[];

  @Column({ type: 'jsonb', nullable: true })
  sharedContract: Record<string, unknown>;

  @Column({ length: 30, default: 'pending' })
  status: TaskStatus;

  @Column({ type: 'int', default: 0 })
  executionOrder: number;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  durationSeconds: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @OneToMany(() => AgentRun, (run) => run.task)
  agentRuns: AgentRun[];
}
