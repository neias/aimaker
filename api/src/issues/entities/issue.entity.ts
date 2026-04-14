import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { GitCheckpoint } from './git-checkpoint.entity';
import { Milestone } from '../../milestones/entities/milestone.entity';

export type IssueStatus =
  | 'waiting'
  | 'analyzing'
  | 'ready'
  | 'processing'
  | 'testing'
  | 'done'
  | 'failed'
  | 'human_required';

@Entity('issues')
@Index(['projectId', 'status'])
@Index(['projectId', 'githubIssueNumber'])
export class Issue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, (project) => project.issues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'int', nullable: true })
  githubIssueNumber: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'text', array: true, default: '{}' })
  labels: string[];

  @Column({ length: 10, default: 'P1' })
  priority: string;

  @Column({ length: 30, default: 'waiting' })
  status: IssueStatus;

  @Column({ length: 30, nullable: true })
  assignedAgent: string;

  @Column({ type: 'int', default: 0 })
  iterationCount: number;

  @Column({ type: 'int', default: 3 })
  maxIterations: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tokenBudgetUsd: number;

  @Column({ type: 'int', default: 0 })
  tokensUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costUsd: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  analysis: string;

  @Column({ type: 'jsonb', nullable: true })
  sharedContract: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  specDocument: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('uuid', { nullable: true })
  milestoneId: string | null;

  @ManyToOne(() => Milestone, (m) => m.issues, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'milestoneId' })
  milestone: Milestone;

  @OneToMany(() => Task, (task) => task.issue)
  tasks: Task[];

  @OneToMany(() => GitCheckpoint, (cp) => cp.issue)
  checkpoints: GitCheckpoint[];
}
