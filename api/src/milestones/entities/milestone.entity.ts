import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Issue } from '../../issues/entities/issue.entity';

export type MilestoneStatus = 'draft' | 'analyzing' | 'ready' | 'in_progress' | 'done' | 'failed';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20, default: 'gsd' })
  strategy: 'gsd' | 'spec_kit';

  @Column({ length: 20, default: 'draft' })
  status: MilestoneStatus;

  @Column({ type: 'text', nullable: true })
  analysis: string;

  @Column({ type: 'jsonb', nullable: true })
  sharedContract: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  specDocument: string;

  @Column({ type: 'int', default: 0 })
  totalTasks: number;

  @Column({ type: 'int', default: 0 })
  completedTasks: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Issue, (issue) => issue.milestone)
  issues: Issue[];
}
