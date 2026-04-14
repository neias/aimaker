'use client';

import { useState, useCallback } from 'react';
import type { Issue } from '@/types';
import { KanbanCard } from './card';
import { ChevronDown } from 'lucide-react';

const PAGE_SIZE = 30;

interface KanbanColumnProps {
  label: string;
  color: string;
  issues: Issue[];
  totalCount: number;
  onProcess: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onSelect: (issue: Issue) => void;
}

export function KanbanColumn({
  label,
  color,
  issues,
  totalCount,
  onProcess,
  onCancel,
  onRetry,
  onDelete,
  onArchive,
  onSelect,
}: KanbanColumnProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = issues.slice(0, visibleCount);
  const hasMore = issues.length > visibleCount;

  // Prevent wheel event from bubbling to parent when column is scrollable
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isScrollable = el.scrollHeight > el.clientHeight;
    if (isScrollable) {
      const atTop = el.scrollTop === 0 && e.deltaY < 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBottom) {
        e.stopPropagation();
      }
    }
  }, []);

  return (
    <div className={`flex flex-col rounded-xl border-t-2 ${color} bg-white/[0.02] border border-t-2 border-white/[0.06] overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-zinc-300">{label}</span>
        <span className="text-[10px] text-zinc-600 bg-white/[0.06] px-1.5 py-0.5 rounded-md font-medium">
          {issues.length === totalCount ? totalCount : `${issues.length}/${totalCount}`}
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5"
        onWheel={handleWheel}
      >
        {visible.map((issue) => (
          <KanbanCard
            key={issue.id}
            issue={issue}
            onProcess={onProcess}
            onCancel={onCancel}
            onRetry={onRetry}
            onDelete={onDelete}
            onArchive={onArchive}
            onSelect={onSelect}
          />
        ))}
        {hasMore && (
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="flex items-center justify-center gap-1 w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <ChevronDown size={12} />
            Show {Math.min(PAGE_SIZE, issues.length - visibleCount)} more
          </button>
        )}
        {issues.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[11px] text-zinc-700">No issues</p>
          </div>
        )}
      </div>
    </div>
  );
}
