'use client';

import type { Issue } from '@/types';
import { Play, X, RotateCcw, AlertTriangle, Trash2, Archive } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-500/20 text-red-400',
  P1: 'bg-amber-500/20 text-amber-400',
  P2: 'bg-zinc-500/20 text-zinc-500',
};

interface KanbanCardProps {
  issue: Issue;
  onProcess: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onSelect: (issue: Issue) => void;
}

export function KanbanCard({ issue, onProcess, onCancel, onRetry, onDelete, onArchive, onSelect }: KanbanCardProps) {
  const canDelete = ['waiting', 'failed', 'human_required'].includes(issue.status);
  const canArchive = issue.status === 'done';

  return (
    <div
      className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 cursor-pointer transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
      onClick={() => onSelect(issue)}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <p className="text-[12px] font-medium leading-snug text-zinc-200 line-clamp-1 flex-1">
          {issue.githubIssueNumber && (
            <span className="text-zinc-600 mr-1">#{issue.githubIssueNumber}</span>
          )}
          {issue.title}
        </p>
        <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.P2}`}>
          {issue.priority}
        </span>
      </div>

      {/* Labels + Actions */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {issue.labels.slice(0, 2).map((label) => (
          <span
            key={label}
            className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-600 truncate max-w-[80px]"
          >
            {label}
          </span>
        ))}
        {issue.labels.length > 2 && (
          <span className="text-[9px] text-zinc-700">+{issue.labels.length - 2}</span>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {issue.status === 'waiting' && (
            <button
              className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded"
              onClick={(e) => { e.stopPropagation(); onProcess(issue.id); }}
            >
              <Play size={8} /> Run
            </button>
          )}
          {['analyzing', 'processing', 'testing'].includes(issue.status) && (
            <button
              className="flex items-center gap-1 text-[9px] text-red-400 hover:text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded"
              onClick={(e) => { e.stopPropagation(); onCancel(issue.id); }}
            >
              <X size={8} /> Stop
            </button>
          )}
          {['failed', 'human_required'].includes(issue.status) && (
            <button
              className="flex items-center gap-1 text-[9px] text-amber-400 hover:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded"
              onClick={(e) => { e.stopPropagation(); onRetry(issue.id); }}
            >
              <RotateCcw size={8} /> Retry
            </button>
          )}
          {canDelete && (
            <button
              className="text-zinc-700 hover:text-red-400 p-0.5 rounded transition-colors"
              onClick={(e) => { e.stopPropagation(); onDelete(issue.id); }}
              title="Delete task"
            >
              <Trash2 size={9} />
            </button>
          )}
          {canArchive && (
            <button
              className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded"
              onClick={(e) => { e.stopPropagation(); onArchive(issue.id); }}
              title="Archive task"
            >
              <Archive size={8} />
            </button>
          )}
        </div>

        {issue.status === 'human_required' && (
          <AlertTriangle size={10} className="text-amber-500 shrink-0" />
        )}
        {issue.status === 'failed' && (
          <X size={10} className="text-red-500 shrink-0" />
        )}
      </div>
    </div>
  );
}
