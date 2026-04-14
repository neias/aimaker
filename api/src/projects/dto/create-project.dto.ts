import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsOptional()
  @IsString()
  githubRepo?: string;

  @IsOptional()
  @IsString()
  githubToken?: string;

  @IsOptional()
  @IsString()
  backendPath?: string;

  @IsOptional()
  @IsString()
  frontendPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  baseBranch?: string;

  @IsOptional()
  @IsIn(['gsd', 'spec_kit'])
  strategy?: 'gsd' | 'spec_kit';
}
