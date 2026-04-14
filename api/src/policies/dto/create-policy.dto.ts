import { IsString, IsOptional, IsIn, IsBoolean, MaxLength } from 'class-validator';
import { PolicyScope } from '../entities/policy.entity';

export class CreatePolicyDto {
  @IsIn(['frontend', 'backend', 'global'])
  scope: PolicyScope;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  rule: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
