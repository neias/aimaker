'use client';

import { useState, useMemo } from 'react';
import type { Issue, IssueStatus } from '@/types';
import { KanbanColumn } from './column';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

const COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status: 'waiting', label: 'Waiting', color: 'border-zinc-600' },
  { status: 'processing', label: 'Processing', color: 'border-blue-500' },
  { status: 'testing', label: 'Testing', color: 'border-yellow-500' },
  { status: 'done', label: 'Done', color: 'border-green-500' },
];

const STATUS_MAP: Record<string, IssueStatus> = {
  waiting: 'waiting',
  analyzing: 'processing',
  ready: 'processing',
  processing: 'processing',
  testing: 'testing',
  done: 'done',
  failed: 'waiting',
  human_required: 'waiting',
};

interface KanbanBoardProps {
  issues: Issue[];
  onProcess: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onSelect: (issue: Issue) => void;
}

export function KanbanBoard({ issues, onProcess, onCancel, onRetry, onDelete, onArchive, onSelect }: KanbanBoardProps) {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = issues;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.labels.some((l) => l.toLowerCase().includes(q)) ||
          (i.githubIssueNumber && `#${i.githubIssueNumber}`.includes(q)),
      );
    }
    if (priorityFilter) {
      result = result.filter((i) => i.priority === priorityFilter);
    }
    return result;
  }, [issues, search, priorityFilter]);

  const grouped = COLUMNS.map((col) => ({
    ...col,
    issues: filtered.filter((i) => {
      const mapped = STATUS_MAP[i.status] || i.status;
      return mapped === col.status;
    }),
    totalCount: issues.filter((i) => {
      const mapped = STATUS_MAP[i.status] || i.status;
      return mapped === col.status;
    }).length,
  }));

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white/[0.04] border-white/[0.08]"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-zinc-600 mr-1" />
          {['P0', 'P1', 'P2'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                priorityFilter === p
                  ? p === 'P0'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                    : p === 'P1'
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 ring-1 ring-zinc-500/30'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]'
              }`}
            >
              {p}
            </button>
          ))}
          {(search || priorityFilter) && (
            <button
              onClick={() => { setSearch(''); setPriorityFilter(null); }}
              className="ml-1 text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              Clear
            </button>
          )}
        </div>
        <span className="ml-auto text-[10px] text-zinc-600">
          {filtered.length} of {issues.length} issues
        </span>
      </div>

      {/* Columns */}
      <div className="relative z-0 grid grid-cols-4 gap-4 h-[calc(100vh-300px)]">
        {grouped.map((col) => (
          <KanbanColumn
            key={col.status}
            label={col.label}
            color={col.color}
            issues={col.issues}
            totalCount={col.totalCount}
            onProcess={onProcess}
            onCancel={onCancel}
            onRetry={onRetry}
            onDelete={onDelete}
            onArchive={onArchive}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
