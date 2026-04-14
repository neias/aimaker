import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['gsd', 'spec_kit'])
  strategy: 'gsd' | 'spec_kit';

  @IsOptional()
  @IsBoolean()
  enableQa?: boolean;
}
