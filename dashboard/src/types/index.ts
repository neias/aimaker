// Project
export interface Project {
  id: string;
  name: string;
  slug: string;
  githubRepo: string | null;
  backendPath: string | null;
  frontendPath: string | null;
  baseBranch: string;
  strategy: 'gsd' | 'spec_kit';
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Issue
export type IssueStatus =
  | 'waiting'
  | 'analyzing'
  | 'ready'
  | 'processing'
  | 'testing'
  | 'done'
  | 'failed'
  | 'human_required';

export interface Issue {
  id: string;
  projectId: string;
  githubIssueNumber: number | null;
  title: string;
  body: string | null;
  labels: string[];
  priority: string;
  status: IssueStatus;
  assignedAgent: string | null;
  iterationCount: number;
  maxIterations: number;
  tokenBudgetUsd: number | null;
  tokensUsed: number;
  costUsd: number;
  metadata: Record<string, unknown>;
  analysis: string | null;
  sharedContract: Record<string, unknown> | null;
  specDocument: string | null;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

// Task
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentRole = 'pm' | 'backend' | 'frontend' | 'qa';

export interface Task {
  id: string;
  issueId: string;
  agentRole: AgentRole;
  title: string;
  description: string | null;
  acceptanceCriteria: string[];
  status: TaskStatus;
  executionOrder: number;
  retryCount: number;
  error: string | null;
  durationSeconds: number | null;
  createdAt: string;
  completedAt: string | null;
  agentRuns?: AgentRun[];
}

// Agent Run
export interface AgentRun {
  id: string;
  taskId: string;
  agentRole: string;
  modelTier: 'L1' | 'L2' | 'L3';
  modelName: string | null;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
}

// Policy
export type PolicyScope = 'frontend' | 'backend' | 'global';

export interface Policy {
  id: string;
  projectId: string;
  scope: PolicyScope;
  name: string;
  description: string | null;
  rule: string;
  enabled: boolean;
  createdAt: string;
}

// Analytics
export interface CostEntry {
  issue_id: string;
  title: string;
  status: string;
  tokens_used: number;
  cost_usd: number;
  iteration_count: number;
}

export interface SuccessRate {
  agent_role: string;
  total_runs: string;
  successful: string;
  failed: string;
}

export interface TimelineEntry {
  date: string;
  total_tokens: string;
  total_cost: string;
  run_count: string;
}

// WebSocket Events
export interface WSEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}
