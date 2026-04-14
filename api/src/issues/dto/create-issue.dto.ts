import { IsString, IsOptional, IsArray, IsIn, IsNumber, IsBoolean } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsNumber()
  githubIssueNumber?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsIn(['P0', 'P1', 'P2'])
  priority?: string;

  @IsOptional()
  @IsNumber()
  tokenBudgetUsd?: number;

  @IsOptional()
  @IsNumber()
  maxIterations?: number;

  @IsOptional()
  @IsBoolean()
  enableQa?: boolean;
}
