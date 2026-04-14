import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Issue } from './issue.entity';

@Entity('git_checkpoints')
export class GitCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  issueId: string;

  @ManyToOne(() => Issue, (issue) => issue.checkpoints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issueId' })
  issue: Issue;

  @Column({ length: 10 })
  repoSide: 'backend' | 'frontend';

  @Column({ length: 255, nullable: true })
  branchName: string;

  @Column({ length: 40 })
  commitSha: string;

  @Column({ length: 30, nullable: true })
  stage: string;

  @CreateDateColumn()
  createdAt: Date;
}
