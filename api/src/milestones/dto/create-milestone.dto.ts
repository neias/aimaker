import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['gsd', 'spec_kit'])
  strategy: 'gsd' | 'spec_kit';
}
