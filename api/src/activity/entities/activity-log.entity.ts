import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ActivityCategory = 'engine' | 'agent' | 'api' | 'ws' | 'system';
export type ActivityLevel = 'info' | 'warn' | 'error' | 'debug';

@Entity('activity_logs')
@Index(['projectId', 'createdAt'])
@Index(['projectId', 'category'])
export class ActivityLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uuid')
  projectId: string;

  @Column('uuid', { nullable: true })
  issueId: string | null;

  @Column('uuid', { nullable: true })
  milestoneId: string | null;

  @Column({ length: 20 })
  category: ActivityCategory;

  @Column({ length: 10, default: 'info' })
  level: ActivityLevel;

  @Column({ length: 100 })
  event: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
