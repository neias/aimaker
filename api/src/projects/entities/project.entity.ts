import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Issue } from '../../issues/entities/issue.entity';
import { Policy } from '../../policies/entities/policy.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 255, nullable: true })
  githubRepo: string;

  @Column({ type: 'text', nullable: true })
  githubTokenEncrypted: string;

  @Column({ type: 'text', nullable: true })
  backendPath: string;

  @Column({ type: 'text', nullable: true })
  frontendPath: string;

  @Column({ length: 100, default: 'main' })
  baseBranch: string;

  @Column({ length: 20, default: 'fullstack' })
  projectType: 'frontend' | 'backend' | 'fullstack';

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20, default: 'gsd' })
  strategy: 'gsd' | 'spec_kit';

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  codebaseSnapshotBackend: string;

  @Column({ type: 'text', nullable: true })
  codebaseSnapshotFrontend: string;

  @Column({ type: 'timestamptz', nullable: true })
  codebaseScannedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Issue, (issue) => issue.project)
  issues: Issue[];

  @OneToMany(() => Policy, (policy) => policy.project)
  policies: Policy[];
}
